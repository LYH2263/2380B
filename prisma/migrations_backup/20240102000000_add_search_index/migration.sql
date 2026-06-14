-- 添加 searchVector 列到 novels 表
ALTER TABLE "novels" ADD COLUMN "searchVector" tsvector;

-- 添加 searchVector 列到 chapters 表
ALTER TABLE "chapters" ADD COLUMN "searchVector" tsvector;

-- 创建 chapter_segments 表
CREATE TABLE "chapter_segments" (
    "id" SERIAL NOT NULL,
    "novelId" INTEGER NOT NULL,
    "chapterId" INTEGER NOT NULL,
    "segmentIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "searchVector" tsvector,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_segments_pkey" PRIMARY KEY ("id")
);

-- 添加外键约束
ALTER TABLE "chapter_segments" ADD CONSTRAINT "chapter_segments_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "novels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chapter_segments" ADD CONSTRAINT "chapter_segments_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 创建唯一约束
ALTER TABLE "chapter_segments" ADD CONSTRAINT "chapter_segments_chapterId_segmentIndex_key" UNIQUE ("chapterId", "segmentIndex");

-- 创建 GIN 索引用于全文搜索
CREATE INDEX "novels_searchVector_idx" ON "novels" USING GIN ("searchVector");
CREATE INDEX "chapters_searchVector_idx" ON "chapters" USING GIN ("searchVector");
CREATE INDEX "chapter_segments_searchVector_idx" ON "chapter_segments" USING GIN ("searchVector");

-- 普通索引
CREATE INDEX "chapter_segments_novelId_idx" ON "chapter_segments"("novelId");
CREATE INDEX "chapter_segments_chapterId_idx" ON "chapter_segments"("chapterId");

-- 创建中文友好的文本搜索配置（基于 simple 配置，用于 Unicode 字符）
-- 注意：如果安装了 zhparser 或 pg_jieba，可以替换为更专业的中文分词
CREATE TEXT SEARCH CONFIGURATION chinese_search (COPY = simple);

-- 自定义 novels 表 searchVector 更新函数
CREATE OR REPLACE FUNCTION novels_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW."searchVector" :=
        setweight(to_tsvector('chinese_search', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('chinese_search', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 自定义 chapters 表 searchVector 更新函数
CREATE OR REPLACE FUNCTION chapters_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW."searchVector" :=
        setweight(to_tsvector('chinese_search', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('chinese_search', COALESCE(NEW.content, '')), 'C');
    NEW."wordCount" := CHAR_LENGTH(COALESCE(NEW.content, ''));
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 自定义 chapter_segments 表 searchVector 更新函数
CREATE OR REPLACE FUNCTION chapter_segments_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW."searchVector" := to_tsvector('chinese_search', COALESCE(NEW.content, ''));
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS novels_search_vector_trigger ON "novels";
CREATE TRIGGER novels_search_vector_trigger
    BEFORE INSERT OR UPDATE OF title, description
    ON "novels"
    FOR EACH ROW
    EXECUTE FUNCTION novels_search_vector_update();

DROP TRIGGER IF EXISTS chapters_search_vector_trigger ON "chapters";
CREATE TRIGGER chapters_search_vector_trigger
    BEFORE INSERT OR UPDATE OF title, content
    ON "chapters"
    FOR EACH ROW
    EXECUTE FUNCTION chapters_search_vector_update();

DROP TRIGGER IF EXISTS chapter_segments_search_vector_trigger ON "chapter_segments";
CREATE TRIGGER chapter_segments_search_vector_trigger
    BEFORE INSERT OR UPDATE OF content
    ON "chapter_segments"
    FOR EACH ROW
    EXECUTE FUNCTION chapter_segments_search_vector_update();

-- 初始化现有数据的 searchVector
UPDATE "novels" SET "searchVector" =
    setweight(to_tsvector('chinese_search', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('chinese_search', COALESCE(description, '')), 'B');

UPDATE "chapters" SET "searchVector" =
    setweight(to_tsvector('chinese_search', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('chinese_search', COALESCE(content, '')), 'C'),
    "wordCount" = CHAR_LENGTH(COALESCE(content, ''));
