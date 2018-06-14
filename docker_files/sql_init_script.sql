CREATE DATABASE lsd_web;
CREATE USER lsd_web_user WITH PASSWORD 'lsd';
ALTER ROLE lsd_web_user SET client_encoding TO 'utf8';
ALTER ROLE lsd_web_user SET default_transaction_isolation TO 'read committed';
GRANT ALL PRIVILEGES ON DATABASE lsd_web TO lsd_web_user;
