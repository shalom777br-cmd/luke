import dotenv from 'dotenv';

dotenv.config();

console.log('Available environment variables keys:');
console.log(Object.keys(process.env).filter(k => 
  k.includes('DB') || k.includes('DATABASE') || k.includes('POSTGRES') || k.includes('SQL') || k.includes('URL') || k.includes('KEY') || k.includes('SUPABASE')
));
