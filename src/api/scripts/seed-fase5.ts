// src/api/scripts/make-link.ts
import mongoose from 'mongoose';
import crypto from 'crypto';
import 'dotenv/config';

// Ajusta rutas si tus modelos están en otra carpeta
import Plaza from '../../models/Plaza';
import Link from '../../models/Link';

function getArg(name: string) {
  const pref = `--${name}=`;
  const found = process.argv.find(a => a.startsWith(pref));
  return found ? found.slice(pref.length) : '';
}

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/inegi_app';
  await mongoose.connect(uri);

  // Si pasas --plaza=<ObjectId> la usamos; si no, tomamos la primera Plaza de la BD
  let plazaId = getArg('plaza');
  if (!plazaId) {
    const p: any = await Plaza.findOne().select('_id puesto codigoPlaza').lean();
    if (!p?._id) {
      console.error('No hay Plazas en la BD. Crea una Plaza primero o pasa --plaza=<ObjectId>');
      process.exit(1);
    }
    plazaId = String(p._id);
    console.log('Usando Plaza encontrada:', plazaId);
  }

  // Genera TOKEN_HEX (48 hex) y TOKEN_HASH (sha256)
  const tokenHex = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(tokenHex, 'utf8').digest('hex');

  // Crea Link válido por 72h
  const expiraAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const link = await Link.create({
    plazaId,
    tokenHash,
    expiraAt,
    usado: false
  });

  console.log('TOKEN_HEX =', tokenHex);
  console.log('TOKEN_HASH =', tokenHash);
  console.log('linkId =', String(link._id));
  console.log('plazaId =', plazaId);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
