export { AVATAR_IDS as AVATARS } from './avatars';

export const RULES = [
  { e: '🐾', t: 'Non disturbare gli animali', d: 'Non inseguirli, non spaventarli e non dar loro da mangiare. La foto va benissimo anche da lontano.' },
  { e: '🙋', t: 'Chiedi al padrone', d: 'Prima di fotografare un cane al guinzaglio, chiedi sempre il permesso. E non avvicinarti ai cani che non conosci.' },
  { e: '🚦', t: 'Occhi sulla strada', d: 'Non camminare guardando lo schermo e fermati prima di scattare. Mai giocare mentre attraversi.' },
  { e: '🏡', t: 'Rispetta le proprietà', d: 'Non entrare in cortili, giardini o proprietà private per trovare un animale.' },
  { e: '🔒', t: 'La tua privacy', d: 'Foto e posizioni restano solo sul tuo telefono. Le carte non indicano il luogo e l\'app non invia a nessuno dove hai trovato gli animali.' },
];

export function Rules() {
  return (
    <div className="rules">
      {RULES.map((r) => (
        <div key={r.t}>
          <span className="e">{r.e}</span>
          <span>
            <b>{r.t}</b>
            <span className="muted">{r.d}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
