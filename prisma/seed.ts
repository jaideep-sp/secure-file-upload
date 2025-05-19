import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');
  const saltRounds = 10;

  const user1Email = 'user1@example.com';
  const user1Password = await bcrypt.hash('password123', saltRounds);
  await prisma.user.upsert({
    where: { email: user1Email },
    update: { password: user1Password },
    create: {
      email: user1Email,
      password: user1Password,
    },
  });
  console.log(`Seeded user: ${user1Email}`);

  const user2Email = 'user2@example.com';
  const user2Password = await bcrypt.hash('securepass', saltRounds);
  await prisma.user.upsert({
    where: { email: user2Email },
    update: { password: user2Password },
    create: {
      email: user2Email,
      password: user2Password,
    },
  });
  console.log(`Seeded user: ${user2Email}`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
