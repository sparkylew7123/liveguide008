-- Create a separate schema for Payload CMS tables
CREATE SCHEMA IF NOT EXISTS payload;

-- Grant permissions to the postgres user
GRANT ALL ON SCHEMA payload TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA payload TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA payload TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA payload TO postgres;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA payload
GRANT ALL ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA payload
GRANT ALL ON SEQUENCES TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA payload
GRANT ALL ON FUNCTIONS TO postgres;