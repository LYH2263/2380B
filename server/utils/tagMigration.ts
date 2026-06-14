import prisma from './prisma'

export async function migrateTagsFromNovels() {
  console.log('Starting tag migration...')

  const novels = await prisma.novel.findMany({
    select: {
      id: true,
      tags: true
    }
  })

  console.log(`Found ${novels.length} novels to process`)

  const allTagNames = new Set<string>()
  novels.forEach(novel => {
    novel.tags.forEach(tag => allTagNames.add(tag))
  })

  console.log(`Found ${allTagNames.size} unique tags`)

  const existingTags = await prisma.tag.findMany({
    select: { id: true, name: true }
  })
  const existingTagNames = new Set(existingTags.map(t => t.name.toLowerCase()))

  const newTagNames = Array.from(allTagNames).filter(
    name => !existingTagNames.has(name.toLowerCase())
  )

  console.log(`Creating ${newTagNames.length} new tags...`)

  for (const tagName of newTagNames) {
    try {
      await prisma.tag.create({
        data: {
          name: tagName,
          category: 'OTHER',
          isCanonical: true
        }
      })
    } catch (e) {
      console.warn(`Failed to create tag "${tagName}":`, e)
    }
  }

  console.log('Creating novel-tag associations...')

  const allTags = await prisma.tag.findMany({
    select: { id: true, name: true }
  })
  const tagMap = new Map(allTags.map(t => [t.name.toLowerCase(), t.id]))

  let createdCount = 0
  for (const novel of novels) {
    for (const tagName of novel.tags) {
      const tagId = tagMap.get(tagName.toLowerCase())
      if (tagId) {
        try {
          await prisma.novelTag.upsert({
            where: {
              novelId_tagId: { novelId: novel.id, tagId }
            },
            update: {},
            create: {
              novelId: novel.id,
              tagId
            }
          })
          createdCount++
        } catch (e) {
          console.warn(`Failed to create novel-tag association for novel ${novel.id} tag ${tagName}:`, e)
        }
      }
    }
  }

  console.log(`Created ${createdCount} novel-tag associations`)

  console.log('Updating tag use counts...')
  const tags = await prisma.tag.findMany({ select: { id: true } })
  for (const tag of tags) {
    const count = await prisma.novelTag.count({ where: { tagId: tag.id } })
    await prisma.tag.update({
      where: { id: tag.id },
      data: { useCount: count }
    })
  }

  console.log('Tag migration completed!')
  return { success: true, novelsProcessed: novels.length, tagsCreated: newTagNames.length }
}

if (require.main === module) {
  migrateTagsFromNovels()
    .then(() => process.exit(0))
    .catch(e => {
      console.error('Migration failed:', e)
      process.exit(1)
    })
}
