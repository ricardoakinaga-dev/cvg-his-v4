set -euo pipefail
test "$(dpkg --print-architecture)" = amd64
export DEBIAN_FRONTEND=noninteractive
apt-get update -y -o Acquire::Retries=3
apt-get install -y --no-install-recommends ca-certificates curl gnupg
install -d -m 0755 /usr/share/keyrings
curl --fail --silent --show-error --location \
  https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  | gpg --dearmor --output /usr/share/keyrings/postgresql.gpg
pgdg_key_fingerprint="$(gpg --show-keys --with-colons /usr/share/keyrings/postgresql.gpg \
  | awk -F: '$1 == "fpr" { print $10; exit }')"
test "${pgdg_key_fingerprint}" = B97B0AFCAA1A47F044F244A07FCC7D46ACCC4CF8
printf '%s\n' \
  'deb [signed-by=/usr/share/keyrings/postgresql.gpg] https://apt.postgresql.org/pub/repos/apt jammy-pgdg main' \
  > /etc/apt/sources.list.d/postgresql.list
apt-get update -y -o Acquire::Retries=3
package_version() {
  apt-cache policy "$1" | awk '$1 == "Candidate:" { print $2; exit }'
}
pg_package=postgresql-16
pg_version="$(package_version "${pg_package}")"
test -n "${pg_version}" && test "${pg_version}" != "(none)"
[[ "${pg_version}" == *.pgdg22.04* ]]
pg_client_package="${pg_package/postgresql-/postgresql-client-}"
pg_client_version="$(package_version "${pg_client_package}")"
test -n "${pg_client_version}" && test "${pg_client_version}" != "(none)"
packages=("${pg_package}" "${pg_client_package}" libpq5 libxml2 libldap-2.5-0 libicu70 redis-server redis-tools liblzf1 libjemalloc2 lua-cjson lua-bitop liblua5.1-0)
package_specs=()
for package in "${packages[@]}"; do
  version="$(package_version "${package}")"
  if [[ -z "${version}" || "${version}" == "(none)" ]]; then
    echo "No APT candidate found for ${package}" >&2
    apt-cache policy "${package}" >&2 || true
    exit 1
  fi
  package_specs+=("${package}=${version}")
done
echo "Selected private coverage PostgreSQL package: ${pg_package}=${pg_version}"
echo "Selected private coverage PostgreSQL client package: ${pg_client_package}=${pg_client_version}"
printf '%s\n' "${packages[@]}" > /out/package-manifest
cd /out
apt-get download "${package_specs[@]}"
