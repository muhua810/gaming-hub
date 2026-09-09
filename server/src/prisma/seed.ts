import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const GAMES = [
  // MOBA
  { name: '英雄联盟', category: 'MOBA', icon: '🎮' },
  { name: 'DOTA2', category: 'MOBA', icon: '🎮' },
  { name: '王者荣耀', category: 'MOBA', icon: '📱' },
  // FPS
  { name: 'CS2', category: 'FPS', icon: '🔫' },
  { name: 'Valorant', category: 'FPS', icon: '🔫' },
  { name: 'APEX英雄', category: 'FPS', icon: '🔫' },
  { name: '守望先锋2', category: 'FPS', icon: '🔫' },
  { name: '绝地求生', category: 'FPS', icon: '🔫' },
  // RPG
  { name: '原神', category: 'RPG', icon: '⚔️' },
  { name: '崩坏：星穹铁道', category: 'RPG', icon: '⚔️' },
  { name: '艾尔登法环', category: 'RPG', icon: '⚔️' },
  { name: '暗黑破坏神4', category: 'RPG', icon: '⚔️' },
  { name: '最终幻想14', category: 'MMORPG', icon: '⚔️' },
  { name: '魔兽世界', category: 'MMORPG', icon: '⚔️' },
  // 沙盒/生存
  { name: '我的世界', category: 'Sandbox', icon: '🧱' },
  { name: '泰拉瑞亚', category: 'Sandbox', icon: '🧱' },
  { name: '幻兽帕鲁', category: 'Survival', icon: '🐾' },
  { name: '英灵神殿', category: 'Survival', icon: '🐾' },
  // 体育/竞速
  { name: 'FIFA/EA FC', category: 'Sports', icon: '⚽' },
  { name: 'NBA 2K', category: 'Sports', icon: '🏀' },
  // 策略
  { name: '云顶之弈', category: 'Strategy', icon: '♟️' },
  { name: '炉石传说', category: 'Strategy', icon: '♟️' },
  // 其他
  { name: '糖豆人', category: 'Party', icon: '🎉' },
  { name: 'Among Us', category: 'Party', icon: '🎉' },
  { name: '永劫无间', category: 'Action', icon: '⚔️' },
  { name: '怪物猎人', category: 'Action', icon: '⚔️' },
];

async function main() {
  console.log('Seeding games...');
  for (const game of GAMES) {
    await prisma.game.upsert({
      where: { name: game.name },
      update: {},
      create: game,
    });
  }
  console.log(`Seeded ${GAMES.length} games.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
