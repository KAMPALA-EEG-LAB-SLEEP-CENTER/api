import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'amarogracie134@gmail.com';
  const plainPassword = 'Naomi123!';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      name: 'Kampala EEG Admin',
      role: 'SUPER_ADMIN',
    },
    create: {
      email,
      password: hashedPassword,
      name: 'Kampala EEG Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log('Super admin seeded:', admin.email, admin.role);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
