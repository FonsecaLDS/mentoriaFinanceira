export function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }
  if (normalized.includes("user already registered")) {
    return "Não foi possível criar a conta com esses dados.";
  }
  if (normalized.includes("password")) {
    return "A senha não atende aos requisitos de segurança.";
  }

  return "Não foi possível concluir a operação. Tente novamente.";
}

export function isInternalPath(value: string | null | undefined) {
  return Boolean(value?.startsWith("/") && !value.startsWith("//"));
}
