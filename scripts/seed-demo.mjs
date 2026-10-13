import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const PREFIX = 'DEMO_';
const PASSWORD = 'Demo1234!';
const TODAY = '2026-10-10';
const TENANTS = [
  { key: 'PESSOAL', name: 'DEMO_Finanças Pessoais', slug: 'demo-financas-pessoais', type: 'individual', owner: 'demo.owner@mentoria.local' },
  { key: 'FAMILIA', name: 'DEMO_Família', slug: 'demo-familia', type: 'family', owner: 'demo.family@mentoria.local' },
  { key: 'EMPRESA', name: 'DEMO_Pequena Empresa', slug: 'demo-pequena-empresa', type: 'business', owner: 'demo.business@mentoria.local' },
];
const USERS = [
  ['demo.owner@mentoria.local', 'DEMO Owner'],
  ['demo.family@mentoria.local', 'DEMO Family Owner'],
  ['demo.editor@mentoria.local', 'DEMO Editor'],
  ['demo.business@mentoria.local', 'DEMO Business Owner'],
  ['demo.viewer@mentoria.local', 'DEMO Viewer'],
];

const fail = (message) => { throw new Error(message); };
const envValue = (text, key) => text.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim().replace(/^"|"$/g, '');
function localConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let apiUrl = url;
  if (!serviceKey || !apiUrl) {
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const dockerDir = process.env.DOCKER_BIN_DIR || path.join(process.env.LOCALAPPDATA || '', 'Programs', 'DockerDesktop', 'resources', 'bin');
    const statusEnv = { ...process.env };
    if (existsSync(dockerDir)) statusEnv.Path = `${dockerDir};${statusEnv.Path || ''}`;
    const status = execFileSync(npx, ['supabase', 'status', '-o', 'env'], { encoding: 'utf8', shell: true, env: statusEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    apiUrl ||= envValue(status, 'API_URL');
    serviceKey ||= envValue(status, 'SERVICE_ROLE_KEY') || envValue(status, 'SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!apiUrl || !/^https?:\/\/(localhost|127\.0\.0\.1):54321$/.test(apiUrl)) fail('Seed bloqueado: o alvo precisa ser o Supabase local em localhost:54321.');
  if (!serviceKey) fail('SERVICE_ROLE_KEY não encontrada. Rode `npx supabase status -o env` ou defina SUPABASE_SERVICE_ROLE_KEY.');
  return { apiUrl, serviceKey };
}

const config = localConfig();
const admin = createClient(config.apiUrl, config.serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const checked = (result, label) => { if (result.error) fail(`${label}: ${result.error.message}`); return result.data; };
const rpc = async (client, fn, args) => checked(await client.rpc(fn, args), fn);
const rows = async (client, table, query = (q) => q) => checked(await query(client.from(table).select('*')), table);
const one = (list, name) => list.find((item) => item.name === name || item.name_normalized === name.toLowerCase());
const isoDate = (month, day = 5) => `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const pastDate = (month) => isoDate(Math.min(month, 10), month === 10 ? 5 : 12);

async function userByEmail(email) {
  let page = 1;
  while (true) {
    const result = checked(await admin.auth.admin.listUsers({ page, perPage: 100 }), 'listUsers');
    const user = result.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (result.users.length < 100) return null;
    page += 1;
  }
}

async function ensureUsers() {
  const result = {};
  for (const [email, name] of USERS) {
    let user = await userByEmail(email);
    if (!user) user = checked(await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { demo_seed: true, display_name: name } }), `createUser ${email}`).user;
    result[email] = user;
  }
  return result;
}

async function ensureTenant(user, spec) {
  const existing = checked(await admin.from('tenants').select('*').eq('slug', spec.slug).maybeSingle(), `tenant ${spec.slug}`);
  if (existing) return existing;
  const client = createClient(config.apiUrl, config.serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  checked(await client.auth.signInWithPassword({ email: spec.owner, password: PASSWORD }), `signIn ${spec.owner}`);
  return await rpc(client, 'create_tenant', { p_name: spec.name, p_slug: spec.slug, p_type: spec.type, p_base_currency: 'BRL', p_timezone: 'America/Sao_Paulo' });
}

async function ownerClient(email) {
  const client = createClient(config.apiUrl, config.serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  checked(await client.auth.signInWithPassword({ email, password: PASSWORD }), `signIn ${email}`);
  return client;
}

async function ensureMember(tenantId, userId, role) {
  const found = checked(await admin.from('tenant_members').select('id').eq('tenant_id', tenantId).eq('user_id', userId).maybeSingle(), 'tenant member lookup');
  if (!found) checked(await admin.from('tenant_members').insert({ tenant_id: tenantId, user_id: userId, role, status: 'active' }), 'tenant member insert');
}

async function ensureCatalog(client, tenantId, userId, tenantKey) {
  const existingCategories = await rows(client, 'categories', (q) => q.eq('tenant_id', tenantId));
  const categories = {};
  for (const item of [
    ['Salário', 'income', 'fixed', 'briefcase-business'], ['Freelance', 'income', 'variable', 'circle-dollar-sign'],
    ['Moradia', 'expense', 'fixed', 'home'], ['Alimentação', 'expense', 'variable', 'utensils'],
    ['Transporte', 'expense', 'variable', 'car'], ['Lazer', 'expense', 'personal', 'gamepad-2'],
  ]) {
    const name = `${PREFIX}${item[0]}`;
    let category = one(existingCategories, name);
    if (!category) category = checked(await client.from('categories').insert({ tenant_id: tenantId, name, type: item[1], budget_group: item[2], icon: item[3], color: '#2563EB' }).select().single(), `category ${name}`);
    categories[item[0]] = category;
  }
  const existingPeople = await rows(client, 'people', (q) => q.eq('tenant_id', tenantId));
  const people = {};
  for (const name of [`${PREFIX}Pessoa 1`, `${PREFIX}Pessoa 2`, `${PREFIX}Família`]) {
    let person = one(existingPeople, name);
    if (!person) person = checked(await client.from('people').insert({ tenant_id: tenantId, name }).select().single(), `person ${name}`);
    people[name] = person;
  }
  const existingCenters = await rows(client, 'cost_centers', (q) => q.eq('tenant_id', tenantId));
  const centers = {};
  for (const name of [`${PREFIX}Casa`, `${PREFIX}Trabalho`, `${PREFIX}Projetos`]) {
    let center = one(existingCenters, name);
    if (!center) center = checked(await client.from('cost_centers').insert({ tenant_id: tenantId, name, description: `Dados de demonstração ${name}` }).select().single(), `cost center ${name}`);
    centers[name] = center;
  }
  return { categories, people, centers };
}

async function ensureAccounts(client, tenantId) {
  const existing = await rows(client, 'accounts', (q) => q.eq('tenant_id', tenantId));
  const result = {};
  for (const item of [
    [`${PREFIX}Conta corrente`, 'checking', 'DEMO Banco', 12000], [`${PREFIX}Poupança`, 'savings', 'DEMO Banco', 8000],
    [`${PREFIX}Carteira digital`, 'digital_wallet', 'DEMO Wallet', 1500], [`${PREFIX}Benefícios VA`, 'benefit', 'DEMO Benefícios', 600],
  ]) {
    let account = one(existing, item[0]);
    if (!account) account = checked(await client.from('accounts').insert({ tenant_id: tenantId, name: item[0], type: item[1], institution_name: item[2], currency: 'BRL', opening_balance: item[3], opening_date: '2026-01-01' }).select().single(), `account ${item[0]}`);
    result[item[1]] = account;
  }
  return result;
}

async function ensureTransactions(client, tenant, catalog, accounts) {
  const current = checked(await client.from('transactions').select('id,description,competence_date,status,amount,type').eq('tenant_id', tenant.id).like('description', `${PREFIX}%`), 'demo transactions lookup');
  const known = new Set(current.map((t) => `${t.description}|${t.competence_date}`));
  let created = 0;
  const templates = [
    ['income', 'Salário', 5800, 'Salário'], ['income', 'Freelance', 850, 'Freelance'], ['expense', 'Moradia', 1800, 'Moradia'],
    ['expense', 'Alimentação', 420, 'Alimentação'], ['expense', 'Transporte', 260, 'Transporte'], ['expense', 'Lazer', 180, 'Lazer'],
    ['expense', 'Alimentação', 310, 'Alimentação'], ['expense', 'Transporte', 190, 'Transporte'], ['expense', 'Lazer', 95, 'Lazer'], ['expense', 'Moradia', 240, 'Moradia'],
  ];
  for (let month = 1; month <= 12; month += 1) for (let index = 0; index < templates.length; index += 1) {
    const [type, label, amount, categoryKey] = templates[index];
    const description = `${PREFIX}${tenant.key}_${label}_${String(month).padStart(2, '0')}_${index}`;
    const date = isoDate(month, index % 2 ? 15 : 5);
    if (known.has(`${description}|${date}`)) continue;
    const past = date <= TODAY;
    const cancelled = past && index === 9 && month % 3 === 0;
    const status = cancelled ? 'cancelled' : past ? 'pending' : 'planned';
    const category = catalog.categories[categoryKey];
    const inserted = checked(await client.from('transactions').insert({ tenant_id: tenant.id, type, description, amount, currency: 'BRL', category_id: category.id, person_id: Object.values(catalog.people)[index % 3].id, cost_center_id: Object.values(catalog.centers)[index % 3].id, account_id: accounts.checking.id, competence_date: date, due_date: date, status, notes: `${PREFIX} dataset`, created_by: tenant.ownerId }).select('id,type,amount,status').single(), `transaction ${description}`);
    created += 1;
    if (past && !cancelled && index < 7) {
      const settleAmount = index === 1 ? Number((amount / 2).toFixed(4)) : amount;
      await rpc(client, 'settle_transaction', { p_transaction_id: inserted.id, p_account_id: accounts.checking.id, p_amount: settleAmount, p_settled_at: `${date}T12:00:00-03:00`, p_idempotency_key: `${PREFIX}${tenant.key}_SETTLE_${month}_${index}` });
    }
  }
  return created;
}

async function ensureTransfers(client, tenant, accounts) {
  for (let index = 1; index <= 4; index += 1) await rpc(client, 'create_transfer', { p_source_account_id: accounts.checking.id, p_target_account_id: accounts.savings.id, p_amount: 50 + index * 10, p_currency: 'BRL', p_effective_at: `${isoDate(index, 20)}T12:00:00-03:00`, p_description: `${PREFIX}${tenant.key} reserva ${index}`, p_idempotency_key: `${PREFIX}${tenant.key}_TRANSFER_${index}` });
}

async function ensureRecurring(client, tenant, catalog, accounts) {
  const existing = await rows(client, 'recurrence_rules', (q) => q.eq('tenant_id', tenant.id).like('description', `${PREFIX}%`));
  if (!existing.length) {
    await rpc(client, 'create_recurrence_rule', { p_tenant_id: tenant.id, p_type: 'expense', p_frequency: 'monthly', p_interval: 1, p_start_date: '2026-01-20', p_end_date: '2026-12-20', p_max_occurrences: 12, p_amount: 120, p_currency: 'BRL', p_description: `${PREFIX}${tenant.key}_Recorrência internet`, p_category_id: catalog.categories.Alimentação.id, p_person_id: Object.values(catalog.people)[0].id, p_cost_center_id: Object.values(catalog.centers)[0].id, p_account_id: accounts.checking.id });
  }
  await rpc(client, 'generate_due_occurrences', { p_tenant_id: tenant.id, p_until_date: TODAY, p_limit: 100 });
}

async function ensurePlanningAndBudgets(client, tenant, catalog) {
  const plans = await rows(client, 'monthly_plan_items', (q) => q.eq('tenant_id', tenant.id));
  if (plans.length < 24) for (let month = 1; month <= 12; month += 1) {
    await rpc(client, 'upsert_monthly_plan_item', { p_tenant_id: tenant.id, p_year: 2026, p_month: month, p_type: 'income', p_amount: 5800, p_currency: 'BRL', p_category_id: catalog.categories.Salário.id, p_account_id: null, p_person_id: null });
    await rpc(client, 'upsert_monthly_plan_item', { p_tenant_id: tenant.id, p_year: 2026, p_month: month, p_type: 'expense', p_amount: 1800, p_currency: 'BRL', p_category_id: catalog.categories.Moradia.id, p_account_id: null, p_person_id: null });
  }
  const budgets = await rows(client, 'category_budgets', (q) => q.eq('tenant_id', tenant.id).eq('budget_year', 2026).eq('budget_month', 10));
  if (budgets.length < 3) for (const category of [catalog.categories.Alimentação, catalog.categories.Transporte, catalog.categories.Lazer]) await rpc(client, 'upsert_category_budget', { p_tenant_id: tenant.id, p_category_id: category.id, p_year: 2026, p_month: 10, p_currency: 'BRL', p_limit_amount: 800 });
}

async function ensureGoals(client, tenant, accounts) {
  const existing = await rows(client, 'financial_goals', (q) => q.eq('tenant_id', tenant.id).like('name', `${PREFIX}%`));
  if (existing.length) return;
  const goal = await rpc(client, 'create_financial_goal', { p_tenant_id: tenant.id, p_name: `${PREFIX}${tenant.key} Reserva de emergência`, p_target_amount: 3000, p_currency: 'BRL', p_target_date: '2026-12-31' });
  const reserve = await rpc(client, 'create_financial_reserve', { p_tenant_id: tenant.id, p_goal_id: goal.id, p_name: `${PREFIX}${tenant.key} Fundo`, p_currency: 'BRL' });
  await rpc(client, 'allocate_to_reserve', { p_tenant_id: tenant.id, p_reserve_id: reserve.id, p_account_id: accounts.savings.id, p_amount: 400, p_effective_at: '2026-02-10T12:00:00-03:00', p_idempotency_key: `${PREFIX}${tenant.key}_RESERVE_ALLOC` });
  await rpc(client, 'withdraw_from_reserve', { p_tenant_id: tenant.id, p_reserve_id: reserve.id, p_account_id: accounts.savings.id, p_amount: 50, p_effective_at: '2026-05-10T12:00:00-03:00', p_idempotency_key: `${PREFIX}${tenant.key}_RESERVE_WITHDRAW` });
}

async function ensureCards(client, tenant, catalog, accounts) {
  const existing = await rows(client, 'credit_cards', (q) => q.eq('tenant_id', tenant.id));
  let card = existing.find((item) => item.name === `${PREFIX}${tenant.key} Cartão principal`);
  if (!card) card = await rpc(client, 'create_credit_card', { p_tenant_id: tenant.id, p_name: `${PREFIX}${tenant.key} Cartão principal`, p_institution_name: 'DEMO Instituição', p_credit_limit: 5000, p_currency: 'BRL', p_closing_day: 10, p_due_day: 20, p_payment_account_id: accounts.checking.id });
  const purchases = await rows(client, 'card_purchases', (q) => q.eq('tenant_id', tenant.id).like('description', `${PREFIX}%`));
  if (!purchases.length) for (let index = 1; index <= 4; index += 1) await rpc(client, 'create_card_purchase', { p_tenant_id: tenant.id, p_card_id: card.id, p_description: `${PREFIX}${tenant.key} Compra ${index}`, p_purchased_at: pastDate(index + 1), p_total_amount: 120 + index * 25, p_currency: 'BRL', p_installments_count: index % 2 ? 1 : 3, p_category_id: catalog.categories.Lazer.id, p_person_id: Object.values(catalog.people)[0].id, p_cost_center_id: Object.values(catalog.centers)[0].id, p_idempotency_key: `${PREFIX}${tenant.key}_PURCHASE_${index}` });
  const cycles = await rows(client, 'invoice_cycles', (q) => q.eq('tenant_id', tenant.id).eq('card_id', card.id));
  for (const cycle of cycles) {
    const invoice = await rpc(client, 'generate_card_invoice', { p_tenant_id: tenant.id, p_card_id: card.id, p_invoice_cycle_id: cycle.id }).catch(() => null);
    if (invoice && cycle.cycle_end <= TODAY) await rpc(client, 'close_card_invoice', { p_tenant_id: tenant.id, p_invoice_id: invoice.id }).catch(() => null);
  }
  const payments = await rows(client, 'card_invoice_payments', (q) => q.eq('tenant_id', tenant.id));
  if (!payments.length) {
    const closed = await rows(client, 'card_invoices', (q) => q.eq('tenant_id', tenant.id).eq('status', 'closed'));
    const invoice = closed.find((item) => Number(item.total_amount) > 0);
    if (invoice) {
      const payment = await rpc(client, 'pay_card_invoice', { p_tenant_id: tenant.id, p_invoice_id: invoice.id, p_account_id: accounts.checking.id, p_amount: invoice.total_amount, p_paid_at: `${TODAY}T12:00:00-03:00`, p_idempotency_key: `${PREFIX}${tenant.key}_CARD_PAYMENT` });
      await rpc(client, 'reverse_card_invoice_payment', { p_payment_id: payment.id, p_idempotency_key: `${PREFIX}${tenant.key}_CARD_PAYMENT_REVERSAL` });
    }
  }
}

async function counts(tenantId) {
  const tables = ['accounts', 'categories', 'people', 'cost_centers', 'transactions', 'transaction_settlements', 'transfers', 'recurrence_rules', 'credit_cards', 'card_purchases', 'invoice_cycles', 'card_invoices', 'financial_goals', 'financial_reserves', 'monthly_plan_items', 'category_budgets', 'audit_logs'];
  const result = {};
  for (const table of tables) { const response = await admin.from(table).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId); checked(response, `count ${table}`); result[table] = response.count ?? 0; }
  return result;
}

async function install() {
  const users = await ensureUsers();
  const summary = [];
  for (const spec of TENANTS) {
    const tenant = await ensureTenant(users[spec.owner], spec);
    await ensureMember(tenant.id, users['demo.editor@mentoria.local'].id, 'editor');
    await ensureMember(tenant.id, users['demo.viewer@mentoria.local'].id, 'viewer');
    const client = await ownerClient(spec.owner);
    const ownerId = users[spec.owner].id;
    const catalog = await ensureCatalog(client, tenant.id, ownerId, spec.key);
    const accounts = await ensureAccounts(client, tenant.id);
    await ensureTransactions(client, { ...tenant, key: spec.key, ownerId }, catalog, accounts);
    await ensureTransfers(client, tenant, accounts);
    await ensureRecurring(client, tenant, catalog, accounts);
    await ensurePlanningAndBudgets(client, tenant, catalog);
    await ensureGoals(client, tenant, accounts);
    await ensureCards(client, tenant, catalog, accounts);
    summary.push({ tenant: spec.slug, counts: await counts(tenant.id) });
  }
  console.log(JSON.stringify({ mode: 'install', local: config.apiUrl, prefix: PREFIX, summary }, null, 2));
}

async function dryRun() {
  const tenants = checked(await admin.from('tenants').select('id,name,slug').like('slug', 'demo-%'), 'demo tenants lookup');
  const summary = [];
  for (const tenant of tenants) summary.push({ tenant: tenant.slug, counts: await counts(tenant.id) });
  console.log(JSON.stringify({ mode: 'dry-run', action: 'nenhuma alteração foi feita', prefix: PREFIX, summary }, null, 2));
}

async function clean() {
  if (!process.argv.includes('--confirm')) fail('Limpeza bloqueada. Use `npm run seed:demo:clean -- --confirm` somente no Supabase local.');
  const tenants = checked(await admin.from('tenants').select('id,slug').like('slug', 'demo-%'), 'demo tenants lookup');
  for (const tenant of tenants) checked(await admin.from('tenants').delete().eq('id', tenant.id), `delete ${tenant.slug}`);
  for (const [email] of USERS) { const user = await userByEmail(email); if (user) checked(await admin.auth.admin.deleteUser(user.id), `delete ${email}`); }
  console.log(JSON.stringify({ mode: 'clean', removedTenants: tenants.map((item) => item.slug), prefix: PREFIX }, null, 2));
}

async function validate() {
  const tenants = checked(await admin.from('tenants').select('id,slug').like('slug', 'demo-%'), 'demo tenants lookup');
  if (tenants.length !== 3) fail(`Esperados 3 tenants DEMO_, encontrados ${tenants.length}.`);
  let totalTransactions = 0;
  for (const tenant of tenants) { const result = await counts(tenant.id); totalTransactions += result.transactions; if (result.transactions < 100) fail(`${tenant.slug} tem poucas transações: ${result.transactions}`); }
  if (totalTransactions < 300) fail(`Esperadas pelo menos 300 transações DEMO_, encontradas ${totalTransactions}.`);
  console.log(JSON.stringify({ mode: 'validate', ok: true, tenants: tenants.length, totalTransactions }, null, 2));
}

const command = process.argv[2] || 'install';
if (command === 'install') await install();
else if (command === 'dry-run') await dryRun();
else if (command === 'clean') await clean();
else if (command === 'validate') await validate();
else fail(`Comando desconhecido: ${command}`);
