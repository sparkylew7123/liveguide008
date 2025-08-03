Manage remote databases

Usage:

Flags:
      --db-url string     Connect using the specified Postgres URL (must be percent-encoded).
  -h, --help              help for remote
  -p, --password string   Password to your remote Postgres database.
  -s, --schema strings    Comma separated list of schema to include.

Global Flags:
      --create-ticket                                  create a support ticket for any CLI error
      --debug                                          output debug logs to stderr
      --dns-resolver [ native | https ]                lookup domain names using the specified resolver (default native)
      --experimental                                   enable experimental features
      --network-id string                              use the specified docker network instead of a generated one
  -o, --output [ env | pretty | json | toml | yaml ]   output format of status variables (default pretty)
      --workdir string                                 path to a Supabase project directory
