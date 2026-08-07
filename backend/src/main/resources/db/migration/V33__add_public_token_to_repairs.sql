ALTER TABLE REPAIRS ADD COLUMN public_token VARCHAR(100);
CREATE UNIQUE INDEX idx_repairs_public_token ON REPAIRS (public_token);
