import { prisma } from '../src/prisma'

async function backfill() {
  try {
    const students = await prisma.user.findMany({ where: { role: 'STUDENT' } })
    let created = 0
    for (const s of students) {
      const exists = await prisma.studentProfile.findUnique({ where: { userId: s.id } })
      if (!exists) {
        await prisma.studentProfile.create({ data: { userId: s.id } })
        created++
      }
    }
    console.log(`Backfill complete. Created ${created} student profiles.`)
  } catch (err) {
    console.error('Backfill error', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

backfill()
