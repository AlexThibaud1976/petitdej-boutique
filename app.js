// Boutique Léman — page « Mes adresses » fidèle à l'US « Ajout d'une adresse de livraison » (RB-01 à RB-09,
// MSG-01 à MSG-09). Données dans localStorage, aucune dépendance.
// BUG VOLONTAIRE (démo) : en Suisse, un code postal à 5 chiffres est accepté (RB-04 exige exactement 4 chiffres).
// « ?sansbug » active la version corrigée (mémorisée), « ?avecbug » revient au bug.
(() => {
  const CLE = 'boutique.adresses';
  const CLE_MODE = 'boutique.sansbug';
  const MAX = 10;
  const PAYS = ['Suisse', 'France', 'Belgique', 'Luxembourg', 'Allemagne'];
  const INTERDITS = /[<>{}[\];]/;
  const MSG = {
    obligatoire: 'Ce champ est obligatoire.',
    doublon: 'Une adresse portant ce nom existe déjà. Veuillez choisir un autre nom.',
    limite: "Vous avez atteint le nombre maximal d'adresses autorisées.",
    pays: "Le pays sélectionné n'est pas pris en charge.",
    codePostal: "Le code postal saisi n'est pas valide pour le pays sélectionné.",
    interdit: 'Le champ contient des caractères non autorisés.',
    longueur: "La longueur saisie n'est pas autorisée.",
    telephone: "Le numéro de téléphone saisi n'est pas valide.",
    succes: "L'adresse a été ajoutée avec succès.",
  };
  // [champ, obligatoire, min, max, texte libre (caractères interdits contrôlés)]
  const CHAMPS = [
    ['nomAdresse', true, 1, 40, true], ['prenom', true, 1, 60, true], ['nom', true, 1, 60, true],
    ['societe', false, 0, 100, true], ['rue', true, 1, 120, true], ['numero', true, 1, 12, true],
    ['complement', false, 0, 120, true], ['pays', true, 1, 20, false], ['codePostal', true, 1, 10, true],
    ['ville', true, 1, 80, true], ['telephone', true, 8, 20, true],
  ];
  const $ = (id) => document.getElementById(id);
  const q = new URLSearchParams(location.search);

  const exemple = (nom, defaut) => ({ nomAdresse: nom, prenom: 'Alexandre', nom: 'Dupont', societe: '', rue: 'Avenue de la Gare',
    numero: '25A', complement: '', pays: 'Suisse', codePostal: '1003', ville: 'Lausanne', telephone: '+41 79 123 45 67', defaut });
  if (q.has('sansbug')) localStorage.setItem(CLE_MODE, '1');
  if (q.has('avecbug')) localStorage.removeItem(CLE_MODE);
  if (q.has('reinitialiser') || localStorage.getItem(CLE) === null) sauver([exemple('Domicile', true)]);
  if (q.has('vide')) sauver([]);
  if (q.has('pleine')) sauver(Array.from({ length: MAX }, (_, i) => exemple(i ? `Adresse ${i + 1}` : 'Domicile', i === 0)));
  const sansBug = () => localStorage.getItem(CLE_MODE) === '1';

  function lire() { try { return JSON.parse(localStorage.getItem(CLE)) || []; } catch { return []; } }
  function sauver(a) { localStorage.setItem(CLE, JSON.stringify(a)); }

  function afficherListe(message) {
    const a = lire();
    $('vue-liste').hidden = false; $('vue-formulaire').hidden = true;
    $('banniere').innerHTML = message ? `<div class="banniere ${message.type}" data-testid="banniere-${message.type === 'ok' ? 'succes' : 'erreur'}">${echap(message.texte)}</div>` : '';
    document.querySelector('[data-testid=compteur-adresses]').textContent = `${a.length} / ${MAX} adresses`;
    const ul = document.querySelector('[data-testid=liste-adresses]');
    ul.innerHTML = a.length ? a.map((x) => `<li data-testid="adresse"><b data-testid="adresse-nom">${echap(x.nomAdresse)}</b>
      ${x.defaut ? '<span class="defaut" data-testid="adresse-defaut">Par défaut</span>' : ''}
      <span>${echap(x.prenom)} ${echap(x.nom)}, ${echap(x.rue)} ${echap(x.numero)}, ${echap(x.codePostal)} ${echap(x.ville)}, ${echap(x.pays)}</span></li>`).join('')
      : '<li data-testid="aucune-adresse">Aucune adresse enregistrée.</li>';
    $('ajouter').disabled = false; // Q-05 non tranchée : le bouton reste actif, le refus se fait à l'enregistrement
  }

  function ouvrirFormulaire() {
    $('formulaire').reset();
    for (const [c] of CHAMPS) marquer(c, '');
    $('banniere-form').innerHTML = '';
    $('banniere').innerHTML = '';
    $('vue-liste').hidden = true; $('vue-formulaire').hidden = false;
    $('nomAdresse').focus();
  }

  function marquer(champ, message) {
    $(`err-${champ}`).textContent = message;
    $(champ).setAttribute('aria-invalid', message ? 'true' : 'false');
    if (message) $(champ).setAttribute('aria-describedby', `err-${champ}`); else $(champ).removeAttribute('aria-describedby');
  }

  function codePostalValide(pays, cp) {
    if (pays === 'Suisse') return sansBug() ? /^\d{4}$/.test(cp) : /^\d{4,5}$/.test(cp); // ← le bug de démo
    if (pays === 'Belgique' || pays === 'Luxembourg') return /^\d{4}$/.test(cp);
    if (pays === 'France' || pays === 'Allemagne') return /^\d{5}$/.test(cp);
    return false;
  }

  function enregistrer(e) {
    e.preventDefault();
    const v = {};
    for (const [c] of CHAMPS) { v[c] = $(c).value.trim(); $(c).value = v[c]; marquer(c, ''); } // RB-08
    v.defaut = $('defaut').checked;
    const erreurs = {};
    for (const [c, oblig] of CHAMPS) if (oblig && !v[c]) erreurs[c] = MSG.obligatoire; // MSG-01
    for (const [c, , min, max, libre] of CHAMPS) {
      if (erreurs[c] || !v[c]) continue;
      if (libre && INTERDITS.test(v[c])) erreurs[c] = MSG.interdit; // RB-07
      else if (v[c].length < min || v[c].length > max) erreurs[c] = MSG.longueur; // MSG-07
    }
    if (!erreurs.pays && !PAYS.includes(v.pays)) erreurs.pays = MSG.pays; // RB-03
    if (!erreurs.telephone && !/^[0-9 +\-()]{8,20}$/.test(v.telephone)) erreurs.telephone = MSG.telephone;
    if (!erreurs.codePostal && !erreurs.pays && !codePostalValide(v.pays, v.codePostal)) erreurs.codePostal = MSG.codePostal; // RB-04
    const adresses = lire();
    const cle = (s) => s.trim().toLowerCase();
    if (!erreurs.nomAdresse && adresses.some((a) => cle(a.nomAdresse) === cle(v.nomAdresse))) erreurs.nomAdresse = MSG.doublon; // RB-02
    const champsFautifs = Object.keys(erreurs);
    if (champsFautifs.length) {
      for (const c of champsFautifs) marquer(c, erreurs[c]);
      $(CHAMPS.map(([c]) => c).find((c) => erreurs[c])).focus(); // focus sur le premier champ invalide
      return;
    }
    if (adresses.length >= MAX) { // RB-01
      $('banniere-form').innerHTML = `<div class="banniere err" data-testid="banniere-erreur">${MSG.limite}</div>`;
      return;
    }
    if (!adresses.length) v.defaut = true; // RB-09
    if (v.defaut) for (const a of adresses) a.defaut = false; // RB-05, RB-06
    adresses.push(v);
    sauver(adresses); // RB-10 : une seule écriture
    afficherListe({ type: 'ok', texte: MSG.succes });
  }

  function echap(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

  $('ajouter').addEventListener('click', ouvrirFormulaire);
  $('annuler').addEventListener('click', () => afficherListe()); // CA-10 : aucune validation, aucun message
  $('formulaire').addEventListener('submit', enregistrer);
  $('raz').addEventListener('click', () => { sauver([exemple('Domicile', true)]); afficherListe(); });
  afficherListe();
})();
