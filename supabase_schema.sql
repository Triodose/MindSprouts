-- =========================================================================
-- 心智圖小苗 (MindSprouts) Supabase 資料庫 Schema
-- =========================================================================

-- 1. 建立心智圖資料表
CREATE TABLE IF NOT EXISTS mindsprouts_mindmaps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. 建立索引以優化特定用戶的查詢效能
CREATE INDEX IF NOT EXISTS mindsprouts_mindmaps_user_id_idx ON mindsprouts_mindmaps (user_id);

-- 3. 啟用行級安全性 (Row Level Security - RLS)
ALTER TABLE mindsprouts_mindmaps ENABLE ROW LEVEL SECURITY;

-- 4. 建立行級安全性存取原則 (RLS Policies)
-- 限制登入用戶只能操作自己的心智圖資料，防止多專案共用時的越權存取

CREATE POLICY "Allow authenticated users to read their own mindmaps" 
ON mindsprouts_mindmaps FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to insert their own mindmaps" 
ON mindsprouts_mindmaps FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update their own mindmaps" 
ON mindsprouts_mindmaps FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete their own mindmaps" 
ON mindsprouts_mindmaps FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 5. 自動同步 updated_at 欄位的觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_mindsprouts_mindmaps_updated_at
BEFORE UPDATE ON mindsprouts_mindmaps
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
