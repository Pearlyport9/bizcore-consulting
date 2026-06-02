-- =============================================================
-- BIZCORE Consulting — Supabase Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================

-- 1. Create posts table (mirrors the MySQL schema)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  date TIMESTAMPTZ,
  author TEXT,
  category TEXT,
  thumbnail TEXT,
  excerpt TEXT,
  content TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  featured BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Anyone can read published posts
CREATE POLICY "Anyone can read published posts"
  ON posts FOR SELECT
  USING (published = true);

-- Authenticated users can read all posts (including drafts)
CREATE POLICY "Authenticated users can read all posts"
  ON posts FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert posts
CREATE POLICY "Authenticated users can insert posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update posts
CREATE POLICY "Authenticated users can update posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete posts
CREATE POLICY "Authenticated users can delete posts"
  ON posts FOR DELETE
  TO authenticated
  USING (true);

-- 4. Storage bucket for blog images
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public to view images
CREATE POLICY "Public can view blog images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

-- Allow authenticated users to upload/delete images
CREATE POLICY "Authenticated users can upload blog images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'blog-images');

CREATE POLICY "Authenticated users can delete blog images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'blog-images');
