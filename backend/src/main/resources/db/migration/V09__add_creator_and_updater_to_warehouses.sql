-- Add creator_id and updater_id columns to WAREHOUSES table
ALTER TABLE WAREHOUSES ADD COLUMN creator_id BIGINT;
ALTER TABLE WAREHOUSES ADD COLUMN updater_id BIGINT;

-- Add foreign key constraints
ALTER TABLE WAREHOUSES ADD CONSTRAINT fk_warehouse_creator FOREIGN KEY (creator_id) REFERENCES USERS(id);
ALTER TABLE WAREHOUSES ADD CONSTRAINT fk_warehouse_updater FOREIGN KEY (updater_id) REFERENCES USERS(id);
