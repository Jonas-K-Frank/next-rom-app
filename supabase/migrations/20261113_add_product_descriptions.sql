-- Migration A: Add AI-generated description columns to products table
-- This migration supports the product description generation pipeline

-- Main description column (will be populated with generated descriptions)
alter table products add column if not exists description text;

-- Source indicator for the description
alter table products add column if not exists description_source text;

-- Audit columns for tracking generation process
alter table products add column if not exists description_generated text;
alter table products add column if not exists description_status text;

-- Index for querying products by description status
create index if not exists idx_products_description_status 
  on products (description_status);

-- Index for finding products with/without descriptions
create index if not exists idx_products_description_null 
  on products (description) where description is not null;
