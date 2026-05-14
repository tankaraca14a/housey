# Kako upravljati stranicom tankaraca.com

Ovo je potpuni vodič za admin stranicu Housey. Svaka radnja koju možete obaviti je ovdje, sa snimkom zaslona točno onoga što ćete vidjeti.

Admin stranica se nalazi na **<https://www.tankaraca.com/admin>**. Spremite link u oznake.

---

## 1. Prijava

Otvorite <https://www.tankaraca.com/admin> u bilo kojem pregledniku.

![Prijava](./admin-screenshots-hr/01-prijava-prazna.png)

Upišite lozinku (istu koju ste do sad koristili) i kliknite **Prijava**.

![Prijava popunjena](./admin-screenshots-hr/02-prijava-popunjena.png)

> **Savjet:** Stranica zna na kojem ste jeziku. U gornjem desnom kutu je mali **HR/EN** gumb — kliknite ga za prebacivanje između hrvatskog i engleskog u svakom trenutku.

---

## 2. Admin stranica na prvi pogled

Nakon prijave vidjet ćete jednu veliku stranicu s tri sekcije:

![Pregled admin stranice](./admin-screenshots-hr/03-pregled-vrh.png)

1. **Kalendar na vrhu** — za blokiranje datuma kada ćete vi koristiti kuću.
2. **Slike** — za prijenos i upravljanje fotografijama na javnoj stranici.
3. **Rezervacije** (skrolajte dolje) — sve rezervacije od gostiju, plus način da sami dodate svoju.

Možete skrolati cijelu stranicu — ništa nije skriveno iza gumba ili izbornika.

---

## 3. Blokiranje vlastitih datuma

Koristite ovo kad **vi** boravite u kući i ne želite da gosti rezerviraju. Datumi koje označite ostaju blokirani dok ih ne uklonite.

![Sekcija kalendara](./admin-screenshots-hr/05-kalendar.png)

**Za blokiranje datuma:** kliknite bilo koji budući dan. Postaje crven.

![Datum kliknut](./admin-screenshots-hr/06-kalendar-kliknut-datum.png)

**Za odblokiranje datuma:** kliknite crveni dan. Vraća se u normalno stanje.

**Možete označiti više datuma prije spremanja.** Koristite gumbe **← Prethodni** / **Sljedeći →** za pomicanje kroz mjesece — možete ići onoliko daleko u budućnost koliko trebate.

Kad ste gotovi, kliknite veliki **Spremi promjene** gumb gore desno. Zelena poruka **"Promjene spremljene!"** to potvrđuje:

![Potvrda spremanja](./admin-screenshots-hr/07-kalendar-spremljeno.png)

> **Što gosti vide:** Blokirani datumi se prikazuju precrtano s "Nedostupno" tooltipom na stranici za rezervaciju. Gosti ih ne mogu odabrati.

---

## 4. Rezervacije gostiju

Svaka rezervacija koju gost pošalje preko web stranice završi ovdje, sa statusom **Na čekanju**. Vi odlučujete što se dalje događa.

![Lista rezervacija](./admin-screenshots-hr/08-rezervacije-lista.png)

Svaka rezervacija prikazuje:
- **Ime gosta + status oznaku** (Na čekanju / Potvrđeno / Odbijeno)
- **Email** (klikabilan — otvara vašu aplikaciju za email da odgovorite)
- **Telefon**
- **Datume dolaska i odlaska**
- **Broj gostiju**
- **Njihovu poruku za vas**
- **Kad su poslali**

### 4.1 Potvrđivanje rezervacije

Svaka rezervacija na čekanju ima ove gumbe s desne strane:

![Red rezervacije na čekanju](./admin-screenshots-hr/09-na-cekanju-red.png)

Kliknite zeleni **✓ Potvrdi** gumb da prihvatite rezervaciju.

Vidjet ćete **dva dijaloga za potvrdu jedan za drugim**, da ne možete slučajno potvrditi:

1. *"Potvrditi ovu rezervaciju?"* → kliknite **OK** za nastavak
2. *"Ovo će poslati email gostu da je rezervacija POTVRĐENA i blokirat će datume: [ime gosta + datumi]"* → kliknite **OK** ako ste sigurni

Nakon oba OK-a, redak rezervacije odmah prikazuje **Potvrđeno** (zelena oznaka), gumbi ✓ Potvrdi i ✗ Odbij nestanu, A toast s gumbom **Poništi** se pojavi u donjem desnom kutu s odbrojavanjem od 10 sekundi:

![Potvrdi undo toast](./admin-screenshots-hr/14b-potvrdi-toast.png)

Tijekom tih 10 sekundi, ništa još nije poslano gostu i nijedan datum u kalendaru nije blokiran. Možete:

- **Kliknuti Poništi** unutar 10 sekundi → rezervacija se vraća na Na čekanju, email se ne šalje, datumi se ne blokiraju. Kao da klik nikad nije ni bio.
- **Pričekati 10 sekundi** (ili samo otići) → tada se automatski događaju tri stvari:
  - Status rezervacije se sprema kao **Potvrđeno** na serveru
  - Datumi boravka se dodaju u vaš blokirani kalendar (tako da drugi gost ne može rezervirati iste noći)
  - Email se šalje gostu s potvrdom rezervacije, uključujući vrijeme dolaska/odlaska i adresu

> **Važno:** Jednom kad prođe 10-sekundni prozor, email je poslan i ne može se poništiti. Ako niste sigurni, kliknite Poništi i ponovo pogledajte rezervaciju.

### 4.2 Odbijanje rezervacije

Isti princip, ali kliknite crveni **✗ Odbij** gumb:

1. *"Odbiti ovu rezervaciju?"* → **OK**
2. *"Ovo će poslati email gostu da rezervacija NIJE PRIHVAĆENA: [ime gosta + datumi]"* → **OK**

Redak prikazuje **Odbijeno** (crvena oznaka), gumbi akcije nestanu, A toast s **Poništi** gumbom se pojavi u donjem desnom kutu s odbrojavanjem od 10 sekundi:

![Odbij undo toast](./admin-screenshots-hr/14c-odbij-toast.png)

- **Kliknite Poništi unutar 10 sekundi** → vraća se na Na čekanju, email se ne šalje.
- **Pričekajte 10 sekundi** → status se sprema i gost prima pristojan email "ne možemo vas primiti, probajte druge datume".

> Odbijene rezervacije ostaju u listi (da imate evidenciju), ali ne rezerviraju kalendar. Netko drugi može rezervirati iste datume.

### 4.3 Uređivanje detalja rezervacije

Ponekad trebate ispraviti pogrešku u kucanju, pomaknuti datume nakon telefonskog razgovora, ili ažurirati poruku gosta. Kliknite **✎ Uredi** gumb na bilo kojem retku.

Pojavljuje se forma sa svakim poljem koje se može uređivati:

![Panel za uređivanje](./admin-screenshots-hr/12-uredi-panel.png)

Promijenite što god treba — ime, email, telefon, datume, broj gostiju, status ili poruku — pa kliknite **Spremi**.

> **Poništi:** Nakon spremanja, mali toast se pojavljuje u donjem desnom kutu s gumbom **Poništi**. Imate **10 sekundi** da kliknete ako ste pogrešno spremili — rezervacija se vraća točno onakva kakva je bila. Nakon 10 sekundi, promjena je trajna.

### 4.4 Slobodna promjena statusa

Svaki redak također ima mali dropdown za status:

![Status dropdown](./admin-screenshots-hr/11-status-dropdown.png)

Možete prebaciti bilo koju rezervaciju između Na čekanju / Potvrđeno / Odbijeno u **bilo kojem smjeru** — na primjer, ako ste slučajno potvrdili i želite vratiti na čekanje.

> **Razlika u odnosu na gumb Potvrdi:** Ovaj dropdown samo mijenja status. NE šalje email i NE dira blokirani kalendar. Koristite ga za ispravke; koristite zeleni Potvrdi kad zaista želite obavijestiti gosta.

### 4.5 Dodavanje ručne rezervacije (rezervacije preko telefona)

Kad netko nazove ili pošalje SMS za rezervaciju, kliknite gumb **+ Dodaj rezervaciju** na vrhu sekcije rezervacija.

![Dodaj rezervaciju](./admin-screenshots-hr/13-dodaj-rezervaciju-prazan.png)

Ispunite sve što znate, odaberite početni status (Na čekanju ako želite kasnije potvrditi, Potvrđeno ako je već sigurno), kliknite **Spremi**.

> Ručne rezervacije ne pokreću email za potvrdu. Ako ipak želite da gost dobije email, pošaljite ga sami ili promijenite status na Na čekanju pa kliknite zeleni **✓ Potvrdi** gumb.

### 4.6 Brisanje rezervacije

🗑 **Obriši** gumb je na svakom retku, neovisno o statusu. Zaštićen je **dvjema potvrdama I 10-sekundnim poništavanjem**:

1. *"Obrisati ovu rezervaciju?"* → **OK**
2. *"Sigurno trajno obrisati rezervaciju za: [ime gosta + datumi]"* → **OK**

Redak odmah nestane iz liste, A toast se pojavi u donjem desnom kutu s odbrojavanjem i gumbom **Poništi**:

![Toast za poništavanje brisanja](./admin-screenshots-hr/14-brisanje-toast.png)

- **Kliknite Poništi unutar 10 sekundi** → rezervacija se vraća, točno onakva kakva je bila. Bez emaila, bez trajne promjene.
- **Pričekajte 10 sekundi** → rezervacija je trajno uklonjena.

> **Važna sitnica:** Ako je rezervacija bila Potvrđena, brisanjem se NE oslobađaju automatski datumi iz kalendara. Ovo je sigurnosna značajka kako pogrešan klik ne bi slučajno ponovno otvorio noći platežnog gosta. Da oslobodite datume: kliknite ih u kalendaru na vrhu stranice i Spremi promjene.

---

## 5. Slike

Slike koje prenesete ovdje automatski se pojavljuju na vašoj javnoj stranici **/gallery** unutar nekoliko sekundi. Bez promjena u kodu, bez čekanja na programera.

![Sekcija slika](./admin-screenshots-hr/15-slike-mreza.png)

### 5.1 Prijenos fotografija

Kliknite plavi **+ Upload** gumb.

![Upload gumb](./admin-screenshots-hr/17-upload-gumb.png)

Otvara se odabir datoteka. Možete:
- Odabrati **jednu fotografiju ili više** odjednom (držite Cmd/Ctrl dok klikate)
- Prenijeti **JPEG, PNG, WebP ili HEIC** (HEIC je ono što iPhone proizvodi — automatski se konvertira u JPEG u vašem pregledniku, ne morate ništa raditi)
- Datoteke do **12 MB svaka** su prihvaćene

Brojač pokazuje "uploading N..." dok se fotografije prenose. Kad brojač dođe na 0, fotografije su uživo.

### 5.2 Označavanje fotografija kao istaknute

Pređite mišem preko bilo koje fotografije da otkrijete gumbe za akcije:

![Akcije nad slikom](./admin-screenshots-hr/16-slika-hover-akcije.png)

Kliknite **★ Feature** da označite. Istaknute fotografije dobivaju žutu ★ FEATURED oznaku.

> **Napomena o istaknutim fotografijama:** Galerija trenutno prikazuje prve 3 istaknute fotografije u "hero" izgledu, a ostale u glavnoj mreži. Ako imate puno istaknutih, samo prve 3 dobivaju hero tretman.

Kliknite **Unstar** za uklanjanje oznake.

### 5.3 Brisanje fotografija

Kliknite 🗑 ikonu kante na bilo kojoj fotografiji. Vidjet ćete dvije potvrde:

1. *"Obrisati ovu fotografiju?"* → **OK**
2. *"Sigurno obrisati ovu fotografiju?"* → **OK**

Fotografija odmah nestane iz mreže, A toast s gumbom **Poništi** se pojavi u donjem desnom kutu s odbrojavanjem od 10 sekundi, jednako kao kod brisanja rezervacije:

- **Kliknite Poništi unutar 10 sekundi** → fotografija se vraća, ništa se nije promijenilo.
- **Pričekajte 10 sekundi** → fotografija je trajno uklonjena (bytes su uklonjeni iz spremišta).

> Ako slučajno kliknete 🗑 i ne vidite toast odmah, skrolajte do donjeg desnog kuta stranice, tu se nalazi gumb Poništi.

---

## 6. Prebacivanje jezika

Mali gumb u gornjem desnom kutu prebacuje između hrvatskog i engleskog. Oznaka pokazuje JEZIK NA KOJI ĆE SE PREBACITI ako kliknete:

- Gumb piše **EN** → stranica je trenutno na HR; klik prebacuje na engleski
- Gumb piše **HR** → stranica je trenutno na EN; klik prebacuje na hrvatski

![EN način](./admin-screenshots-hr/18-en-nacin-vrh.png)

Sve — oznake u kalendaru, tekst gumba, oznake statusa, dijalozi za potvrdu — prilagođava se odabranom jeziku.

---

## 7. Odjava

Kliknite **Odjava** gumb (gornji desni kut).

![Odjavljeni](./admin-screenshots-hr/19-odjavljen.png)

Ovo briše vašu lozinku iz memorije preglednika. Korisno ako ste na zajedničkom računalu.

> **Zatvaranje kartice preglednika** vas također odjavljuje — vaša lozinka se nikad ne sprema na disk.

---

## 8. Što učiniti ako nešto pođe po zlu

### "Kliknula sam Potvrdi na pogrešnu rezervaciju"

- **Unutar 10 sekundi:** kliknite **Poništi** gumb u toastu u donjem desnom kutu. Email se ne šalje. Datumi se ne blokiraju. Rezervacija se vraća na Na čekanju.
- **Nakon 10 sekundi (email je već otišao):**
  - Gost već ima email s potvrdom. Ne možete ga povući.
  - Pošaljite mu email izravno iz vašeg inboxa (mailto link je na retku rezervacije) i objasnite.
  - Koristite **status dropdown** da prebacite rezervaciju natrag na Na čekanju ili Odbijeno.
  - Datumi koji su se automatski blokirali kad ste potvrdili će i dalje biti blokirani. Kliknite ih u kalendaru na vrhu i Spremi promjene.

### "Kliknula sam Odbij na pogrešnu"

- **Unutar 10 sekundi:** kliknite **Poništi** gumb u toastu u donjem desnom kutu. Email se ne šalje.
- **Nakon 10 sekundi:** pošaljite gostu email izravno da se ispričate, pa koristite status dropdown da ih vratite na Na čekanju.

### "Slučajno sam obrisala rezervaciju"

- **Unutar 10 sekundi:** kliknite gumb **Poništi** u toastu u donjem desnom kutu.
- **Nakon 10 sekundi:** rezervacija je nestala. Pitajte gosta da ponovno pošalje preko stranice, ili koristite **+ Dodaj rezervaciju** za ručni unos iz emaila/bilješki.

### "Slučajno sam blokirala krivi datum"

- Kliknite ponovno na crveni datum u kalendaru — postaje proziran.
- Kliknite **Spremi promjene**. To je sve.

### "Prenijela sam krivu fotografiju"

- Pređite mišem preko fotografije, kliknite 🗑, prođite kroz obje potvrde.
- Fotografija nestane, toast s **Poništi** gumbom se pojavi u donjem desnom kutu s odbrojavanjem od 10 sekundi.
- Pričekajte 10 sekundi → trajno je obrisana.
- Kliknite Poništi unutar 10 sekundi → vraća se.

### "Slučajno sam obrisala krivu fotografiju"

- **Unutar 10 sekundi:** kliknite **Poništi** gumb u toastu u donjem desnom kutu.
- **Nakon 10 sekundi:** bytes fotografije su otišli iz spremišta. Morate ponovno prenijeti s telefona.

### "Stranica se ne učitava / nešto izgleda neispravno"

- Osvježite stranicu (Cmd/Ctrl + R).
- Ako ste odjavljeni nakon osvježavanja, prijavite se ponovno — vaše neslspremljene izmjene su izgubljene, ali spremljeni podaci su sigurni.
- Ako gumb ne radi ništa kad ga kliknete, pričekajte 5 sekundi — server može biti spor.
- Ako nešto stalno ne radi, zapišite što se dogodilo (koji gumb, što ste vidjeli) i vrijeme, i javite Mihaeli.

### "Gost kaže da nije dobio email s potvrdom"

- Provjerite oznaku statusa rezervacije — ako je još **Na čekanju**, nikad niste kliknuli Potvrdi (samo Potvrdi šalje email; status dropdown ne šalje).
- Ako je status **Potvrđeno**, email je poslan. Pitajte gosta da provjeri spam folder. Email dolazi s adrese `noreply@tankaraca.com`.

---

## Od čega vas sustav štiti

Ne morate ovo pamtiti — admin stranica ovo automatski provodi:

- **Dvostruke rezervacije:** Ako dva gosta pošalju preklapajuće datume, drugi se odbije s jasnom porukom. Nikad ne završe oba kao na čekanju.
- **Pogrešni klikovi na destruktivne radnje:** Potvrdi, Odbij i Obriši svaki zahtijevaju dva klika kroz dijaloge za potvrdu.
- **Trajni gubitak zbog pogreške:** Potvrda rezervacije, Odbijanje, Brisanje, Uređivanje I Brisanje fotografije svako imaju 10-sekundno poništavanje. Toast se pojavi u donjem desnom kutu zaslona.
- **Email poslan slučajno:** Emailovi za Potvrdi i Odbij se NE šalju dok ne prođe 10-sekundni prozor poništavanja. Kliknite Poništi i email nikad neće biti poslan, gost nikad neće znati.
- **Gubljenje nespremljenih izmjena kalendara:** Ako ste označili neke datume i zaboravili kliknuti Spremi promjene, stranica pita "imate nespremljene promjene, stvarno odustati?" prije nego što vam dopusti da se odjavite, osvježite ili zatvorite karticu.
- **Izgubljene rezervacije zbog problema s emailom:** Rezervacije se spremaju u bazu PRIJE nego što email ode. Ako email ne uspije iz bilo kojeg razloga, rezervacija je još uvijek tamo i vidite je u listi.

---

## Što još nije u ovom vodiču (za sada)

Postoji na listi zadataka kao GitHub issues — ništa od ovoga vas ne sprječava da vodite stvari danas:

- **Instagram / Facebook linkovi** ([#2](https://github.com/tankaraca14a/housey/issues/2)) — kad napravite račune, javite Mihaeli URL-ove.
- **Više istaknutih fotografija vidljivo odjednom** ([#7](https://github.com/tankaraca14a/housey/issues/7)) — trenutno samo prve 3 istaknute fotografije dobivaju hero pozicije.

---

*Posljednje ažuriranje: ovaj dokument i njegovi screenshotovi su ponovno generirani pokretanjem `node scripts/generate-admin-guide-screenshots-hr.mjs` nad lokalnom kopijom housey admin stranice. Ako nešto ikad izgleda drugačije od onoga što je prikazano ovdje, sama stranica je izvor istine.*
