import bcrypt from 'bcryptjs';

async function generate() {
    const password = process.argv[2] || 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
}

generate();
