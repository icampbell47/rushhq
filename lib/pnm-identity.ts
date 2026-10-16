export function normalizePnmIdentityPart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function getPnmIdentityKeys(value: { first_name: string; last_name: string }) {
  return {
    first_name_key: normalizePnmIdentityPart(value.first_name),
    last_name_key: normalizePnmIdentityPart(value.last_name)
  };
}
