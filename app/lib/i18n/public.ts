// Central translation dict for all public-facing pages. Five languages:
// English (default), Croatian, German, Italian, French.
//
// Naming: keys are prefixed by page (`home.`, `about.`, `booking.`, etc.)
// for grep-ability. Add a new key here first, then reference via the t()
// function from app/components/LangProvider (re-exported below).

import type { Lang } from "./types";

export interface PublicStrings {
  // ── shared / layout ────────────────────────────────────────────────
  "nav.about": string;
  "nav.gallery": string;
  "nav.location": string;
  "nav.booking": string;
  "nav.reviews": string;
  "nav.contact": string;
  "nav.menu": string;
  "footer.rights": string;
  "footer.builtBy": string;

  // ── home ───────────────────────────────────────────────────────────
  "home.heroAlt": string;
  "home.heroSubtitle": string;
  "home.bookNow": string;
  "home.featuresEyebrow": string;
  "home.featuresTitle": string;
  "home.featuresParagraph": string;
  "home.featureSeaView": string;
  "home.featurePeaceful": string;
  "home.featureEquipped": string;
  "home.featureWifi": string;
  "home.viewGallery": string;
  "home.pillBeach": string;
  "home.pillKitchen": string;
  "home.pillTerrace": string;
  "home.pillSunset": string;

  // ── featured reviews strip (used on home) ──────────────────────────
  "strip.eyebrow": string;
  "strip.heading": string;
  "strip.readAll": string;

  // ── about ──────────────────────────────────────────────────────────
  "about.title": string;
  "about.subtitle": string;
  "about.imageAlt": string;
  "about.welcomeTitle": string;
  "about.welcomeParagraph": string;
  "about.featuresTitle": string;
  "about.featureBedrooms": string;
  "about.featureBathrooms": string;
  "about.featureKitchen": string;
  "about.featureLiving": string;
  "about.featureTerrace": string;
  "about.featureParking": string;
  "about.amenitiesTitle": string;
  "about.amenityAcHeat": string;
  "about.amenityWifi": string;
  "about.amenityTv": string;
  "about.amenityBbq": string;
  "about.amenityBeach": string;
  "about.amenityLinens": string;
  "about.locationTitle": string;
  "about.locationP1": string;
  "about.locationP2": string;
  "about.bookCta": string;

  // ── location ───────────────────────────────────────────────────────
  "location.title": string;
  "location.subtitle": string;
  "location.imageAlt": string;
  "location.gettingHereTitle": string;
  "location.addressLabel": string;
  "location.gpsLabel": string;
  "location.openMaps": string;
  "location.introPara": string;
  "location.airportLabel": string;
  "location.airportValue": string;
  "location.ferryLabel": string;
  "location.ferryValue": string;
  "location.carLabel": string;
  "location.carValue": string;
  "location.dubrovnikLabel": string;
  "location.dubrovnikValue": string;
  "location.attractionsTitle": string;
  "location.natureBeachesTitle": string;
  "location.natureBullet1": string;
  "location.natureBullet2": string;
  "location.natureBullet3": string;
  "location.natureBullet4": string;
  "location.localAmenitiesTitle": string;
  "location.localBullet1": string;
  "location.localBullet2": string;
  "location.localBullet3": string;
  "location.localBullet4": string;
  "location.mapTitle": string;
  "location.mapCaption": string;
  "location.aboutVlTitle": string;
  "location.aboutVlP1": string;
  "location.aboutVlP2": string;
  "location.aboutVlP3": string;

  // ── reviews ────────────────────────────────────────────────────────
  "reviews.eyebrow": string;
  "reviews.title": string;
  "reviews.description": string;
  "reviews.emptyState": string;
  "reviews.readOnSource": string; // template "Read on {source} →"

  // ── contact ────────────────────────────────────────────────────────
  "contact.title": string;
  "contact.subtitle": string;
  "contact.getInTouch": string;
  "contact.address": string;
  "contact.emailLabel": string;
  "contact.phoneLabel": string;
  "contact.responseTime": string;
  "contact.responseTimeValue": string;
  "contact.viewOnMap": string;
  "contact.officeHours": string;
  "contact.followUs": string;
  "contact.weekdaysLabel": string;
  "contact.weekdaysHours": string;
  "contact.saturdayLabel": string;
  "contact.saturdayHours": string;
  "contact.sundayLabel": string;
  "contact.closed": string;
  "contact.sendMessage": string;
  "contact.thankYou": string;
  "contact.nameLabel": string;
  "contact.contactEmailLabel": string;
  "contact.subjectLabel": string;
  "contact.messageLabel": string;
  "contact.placeholderName": string;
  "contact.placeholderEmail": string;
  "contact.placeholderSubject": string;
  "contact.placeholderMessage": string;
  "contact.sending": string;
  "contact.sendBtn": string;
  "contact.errNameMin": string;
  "contact.errEmail": string;
  "contact.errSubjectReq": string;
  "contact.errMessageMin": string;
  "contact.alertFailed": string;

  // ── booking ────────────────────────────────────────────────────────
  "booking.title": string;
  "booking.subtitle": string;
  "booking.pricingTitle": string;
  "booking.peakSeason": string;
  "booking.midSeason": string;
  "booking.lowSeason": string;
  "booking.pricingPeakValue": string;
  "booking.pricingMidValue": string;
  "booking.pricingLowValue": string;
  "booking.minStay": string;
  "booking.maxCapacity": string;
  "booking.checkInHours": string;
  "booking.checkOutHours": string;
  "booking.includedTitle": string;
  "booking.amenityKitchen": string;
  "booking.amenityWifiTv": string;
  "booking.amenityAc": string;
  "booking.amenityParking": string;
  "booking.amenityTerrace": string;
  "booking.amenityBbq": string;
  "booking.amenityBeach": string;
  "booking.amenityLinens": string;
  "booking.reservationRequestTitle": string;
  "booking.thankYouToast": string;
  "booking.selectDatesLabel": string;
  "booking.minStayError": string;
  "booking.unavailableRangeError": string;
  "booking.selectDatesError": string;
  "booking.failedAlert": string;
  "booking.clickCheckIn": string;
  "booking.clickCheckOut": string;
  "booking.legendSelected": string;
  "booking.legendRange": string;
  "booking.legendUnavailable": string;
  "booking.calPrev": string;
  "booking.calNext": string;
  "booking.checkInRow": string;
  "booking.checkOutRow": string;
  "booking.durationRow": string;
  "booking.nightsSuffix": string;
  "booking.nightSuffix": string;
  "booking.nameLabel": string;
  "booking.emailLabel": string;
  "booking.phoneLabel": string;
  "booking.guestsLabel": string;
  "booking.guestSelectPlaceholder": string;
  "booking.guest1": string;
  "booking.guest2": string;
  "booking.messageLabel": string;
  "booking.placeholderName": string;
  "booking.placeholderEmail": string;
  "booking.placeholderPhone": string;
  "booking.placeholderMessage": string;
  "booking.submitting": string;
  "booking.submitBtn": string;
  "booking.tooltipMinNights": string;
  "booking.tooltipUnavailable": string;
  "booking.errNameMin": string;
  "booking.errEmail": string;
  "booking.errPhoneMin": string;
  "booking.errGuestsReq": string;
  "booking.calMonthJan": string;
  "booking.calMonthFeb": string;
  "booking.calMonthMar": string;
  "booking.calMonthApr": string;
  "booking.calMonthMay": string;
  "booking.calMonthJun": string;
  "booking.calMonthJul": string;
  "booking.calMonthAug": string;
  "booking.calMonthSep": string;
  "booking.calMonthOct": string;
  "booking.calMonthNov": string;
  "booking.calMonthDec": string;
  "booking.calDayMon": string;
  "booking.calDayTue": string;
  "booking.calDayWed": string;
  "booking.calDayThu": string;
  "booking.calDayFri": string;
  "booking.calDaySat": string;
  "booking.calDaySun": string;

  // ── gallery ────────────────────────────────────────────────────────
  "gallery.eyebrow": string;
  "gallery.title": string;
  "gallery.description": string;
  "gallery.catAll": string;
  "gallery.catAerial": string;
  "gallery.catCoast": string;
  "gallery.catExterior": string;
  "gallery.catTerrace": string;
  "gallery.catInterior": string;
  "gallery.emptyCategory": string;
}

export const publicTranslations: Record<Lang, PublicStrings> = {
  en: {
    "nav.about": "About",
    "nav.gallery": "Gallery",
    "nav.location": "Location",
    "nav.booking": "Booking",
    "nav.reviews": "Reviews",
    "nav.contact": "Contact",
    "nav.menu": "Menu",
    "footer.rights": "All rights reserved.",
    "footer.builtBy": "Built by Mihaela MJ",

    "home.heroAlt": "Aerial view of Dalmatian coast property",
    "home.heroSubtitle": "Your escape by the sea. Surrounded by azure waters.",
    "home.bookNow": "Book Now",
    "home.featuresEyebrow": "House on the Dalmatian Coast",
    "home.featuresTitle": "The perfect place to relax and unwind",
    "home.featuresParagraph": "Beautiful house on the Dalmatian coast, surrounded by the sea on almost all sides. Enjoy crystal clear waters, peaceful location, and stunning sunsets.",
    "home.featureSeaView": "Sea view",
    "home.featurePeaceful": "Peaceful location",
    "home.featureEquipped": "Fully equipped",
    "home.featureWifi": "WiFi & parking",
    "home.viewGallery": "View gallery →",
    "home.pillBeach": "Beach nearby",
    "home.pillKitchen": "Fully equipped kitchen",
    "home.pillTerrace": "Terrace with view",
    "home.pillSunset": "Sunset views",

    "strip.eyebrow": "From past guests",
    "strip.heading": "What guests say",
    "strip.readAll": "Read all reviews →",

    "about.title": "About the House",
    "about.subtitle": "Your perfect getaway on the Dalmatian coast",
    "about.imageAlt": "House overview",
    "about.welcomeTitle": "Welcome to Paradise",
    "about.welcomeParagraph": "Nestled on a secluded peninsula on the Dalmatian coast, our house offers a unique retreat surrounded by crystal-clear azure waters on nearly all sides. This hidden gem provides the perfect escape from everyday life, combining the tranquility of nature with modern comforts.",
    "about.featuresTitle": "Property Features",
    "about.featureBedrooms": "3 bedrooms, sleeps up to 6 guests",
    "about.featureBathrooms": "2 bathrooms with modern fixtures",
    "about.featureKitchen": "Fully equipped kitchen",
    "about.featureLiving": "Spacious living area",
    "about.featureTerrace": "Outdoor terrace with sea views",
    "about.featureParking": "Private parking space",
    "about.amenitiesTitle": "Amenities",
    "about.amenityAcHeat": "Air conditioning & heating",
    "about.amenityWifi": "High-speed WiFi",
    "about.amenityTv": "Flat-screen TV",
    "about.amenityBbq": "BBQ grill",
    "about.amenityBeach": "Beach access",
    "about.amenityLinens": "Linens and towels provided",
    "about.locationTitle": "The Location",
    "about.locationP1": "The house is located in one of the most beautiful and peaceful areas of the Dalmatian coast. Surrounded by the sea on almost all sides, you'll wake up to breathtaking views and the soothing sound of waves.",
    "about.locationP2": "Despite the secluded feel, local amenities including restaurants, shops, and attractions are just a short drive away. The property offers the perfect balance of privacy and convenience.",
    "about.bookCta": "Book Your Stay",

    "location.title": "Location",
    "location.subtitle": "Discover the beauty of the Dalmatian coast",
    "location.imageAlt": "Aerial view of location",
    "location.gettingHereTitle": "Getting Here",
    "location.addressLabel": "Property Address",
    "location.gpsLabel": "GPS Coordinates:",
    "location.openMaps": "📍 Open in Google Maps",
    "location.introPara": "Our house is located in Vela Luka on the beautiful island of Korčula, one of Croatia's most stunning Adriatic islands. The property is easily accessible from major Croatian cities and airports.",
    "location.airportLabel": "Nearest Airport:",
    "location.airportValue": "Split Airport (approx. 2 hours drive + ferry)",
    "location.ferryLabel": "By Ferry:",
    "location.ferryValue": "Regular ferry from Split to Vela Luka (2.5-3 hours)",
    "location.carLabel": "By Car:",
    "location.carValue": "Private parking available on-site",
    "location.dubrovnikLabel": "From Dubrovnik:",
    "location.dubrovnikValue": "Ferry connections also available",
    "location.attractionsTitle": "Nearby Attractions",
    "location.natureBeachesTitle": "Nature & Beaches",
    "location.natureBullet1": "Pristine beaches (walking distance)",
    "location.natureBullet2": "Crystal-clear swimming spots",
    "location.natureBullet3": "Hiking trails with sea views",
    "location.natureBullet4": "Snorkeling and diving spots",
    "location.localAmenitiesTitle": "Local Amenities",
    "location.localBullet1": "Traditional Dalmatian restaurants",
    "location.localBullet2": "Local markets and shops",
    "location.localBullet3": "Historic towns and villages",
    "location.localBullet4": "Water sports and boat rentals",
    "location.mapTitle": "Map",
    "location.mapCaption": "Click on the map to open in Google Maps for directions",
    "location.aboutVlTitle": "About Vela Luka & Korčula",
    "location.aboutVlP1": "Vela Luka is a charming town on the western end of Korčula island, known for its beautiful bay, crystal-clear waters, and authentic Mediterranean atmosphere. The island of Korčula is famous for its stunning sunsets, fresh seafood, and warm climate.",
    "location.aboutVlP2": "Summer months (June-September) are perfect for swimming and water activities, while spring and autumn offer milder weather ideal for exploring. The town offers numerous restaurants, cafes, and local markets where you can experience authentic Dalmatian culture.",
    "location.aboutVlP3": "Don't miss visiting the famous Korčula Old Town, local wineries, and nearby islands. The area is perfect for sailing, diving, and enjoying the Mediterranean lifestyle.",

    "reviews.eyebrow": "From past guests",
    "reviews.title": "Reviews",
    "reviews.description": "What guests have said after staying at Housey, Vela Luka.",
    "reviews.emptyState": "No reviews yet — check back soon.",
    "reviews.readOnSource": "Read on {source} →",

    "contact.title": "Contact Us",
    "contact.subtitle": "Have questions? We'd love to hear from you.",
    "contact.getInTouch": "Get in Touch",
    "contact.address": "Address",
    "contact.emailLabel": "Email",
    "contact.phoneLabel": "Phone",
    "contact.responseTime": "Response Time",
    "contact.responseTimeValue": "We typically respond within 24 hours",
    "contact.viewOnMap": "📍 View on Map →",
    "contact.officeHours": "Office Hours",
    "contact.followUs": "Follow us",
    "contact.weekdaysLabel": "Monday - Friday",
    "contact.weekdaysHours": "9:00 AM - 6:00 PM",
    "contact.saturdayLabel": "Saturday",
    "contact.saturdayHours": "10:00 AM - 4:00 PM",
    "contact.sundayLabel": "Sunday",
    "contact.closed": "Closed",
    "contact.sendMessage": "Send us a Message",
    "contact.thankYou": "Thank you for your message! We'll get back to you soon.",
    "contact.nameLabel": "Name *",
    "contact.contactEmailLabel": "Email *",
    "contact.subjectLabel": "Subject *",
    "contact.messageLabel": "Message *",
    "contact.placeholderName": "Your name",
    "contact.placeholderEmail": "your@email.com",
    "contact.placeholderSubject": "What is your inquiry about?",
    "contact.placeholderMessage": "Your message...",
    "contact.sending": "Sending...",
    "contact.sendBtn": "Send Message",
    "contact.errNameMin": "Name must be at least 2 characters",
    "contact.errEmail": "Invalid email address",
    "contact.errSubjectReq": "Subject is required",
    "contact.errMessageMin": "Message must be at least 10 characters",
    "contact.alertFailed": "Failed to send message. Please try again or email us directly.",

    "booking.title": "Book Your Stay",
    "booking.subtitle": "Fill out the form below and we'll get back to you shortly to confirm your reservation.",
    "booking.pricingTitle": "Pricing & Details",
    "booking.peakSeason": "Peak Season (Jun-Sep)",
    "booking.midSeason": "Mid Season (Apr-May, Oct)",
    "booking.lowSeason": "Low Season (Nov-Mar)",
    "booking.pricingPeakValue": "€270/night",
    "booking.pricingMidValue": "€220/night",
    "booking.pricingLowValue": "€180/night",
    "booking.minStay": "✓ Minimum stay: 5 nights",
    "booking.maxCapacity": "✓ Maximum capacity: 2 guests",
    "booking.checkInHours": "✓ Check-in: 4:00 PM",
    "booking.checkOutHours": "✓ Check-out: 10:00 AM",
    "booking.includedTitle": "What's Included",
    "booking.amenityKitchen": "Fully equipped kitchen",
    "booking.amenityWifiTv": "WiFi & TV",
    "booking.amenityAc": "Air conditioning",
    "booking.amenityParking": "Private parking",
    "booking.amenityTerrace": "Outdoor terrace",
    "booking.amenityBbq": "BBQ grill",
    "booking.amenityBeach": "Beach access",
    "booking.amenityLinens": "Linens & towels",
    "booking.reservationRequestTitle": "Reservation Request",
    "booking.thankYouToast": "Thank you! We've received your booking request and will contact you soon.",
    "booking.selectDatesLabel": "Select Dates *",
    "booking.minStayError": "Minimum stay is 5 nights.",
    "booking.unavailableRangeError": "Your selected range includes unavailable dates. Please choose different dates.",
    "booking.selectDatesError": "Please select check-in and check-out dates.",
    "booking.failedAlert": "Failed to send booking request. Please try again or contact us directly.",
    "booking.clickCheckIn": "👆 Click a date to select check-in",
    "booking.clickCheckOut": "👆 Now select check-out (min. 5 nights)",
    "booking.legendSelected": "Selected",
    "booking.legendRange": "Range",
    "booking.legendUnavailable": "Unavailable",
    "booking.calPrev": "← Previous",
    "booking.calNext": "Next →",
    "booking.checkInRow": "Check-in:",
    "booking.checkOutRow": "Check-out:",
    "booking.durationRow": "Duration:",
    "booking.nightsSuffix": "nights",
    "booking.nightSuffix": "night",
    "booking.nameLabel": "Full Name *",
    "booking.emailLabel": "Email Address *",
    "booking.phoneLabel": "Phone Number *",
    "booking.guestsLabel": "Number of Guests *",
    "booking.guestSelectPlaceholder": "Select...",
    "booking.guest1": "1 guest",
    "booking.guest2": "2 guests",
    "booking.messageLabel": "Additional Message (Optional)",
    "booking.placeholderName": "John Doe",
    "booking.placeholderEmail": "john@example.com",
    "booking.placeholderPhone": "+1 234 567 890",
    "booking.placeholderMessage": "Any special requests or questions?",
    "booking.submitting": "Submitting...",
    "booking.submitBtn": "Submit Booking Request",
    "booking.tooltipMinNights": "Min. 5 nights",
    "booking.tooltipUnavailable": "Unavailable",
    "booking.errNameMin": "Name must be at least 2 characters",
    "booking.errEmail": "Invalid email address",
    "booking.errPhoneMin": "Phone number is required",
    "booking.errGuestsReq": "Number of guests is required",
    "booking.calMonthJan": "January",
    "booking.calMonthFeb": "February",
    "booking.calMonthMar": "March",
    "booking.calMonthApr": "April",
    "booking.calMonthMay": "May",
    "booking.calMonthJun": "June",
    "booking.calMonthJul": "July",
    "booking.calMonthAug": "August",
    "booking.calMonthSep": "September",
    "booking.calMonthOct": "October",
    "booking.calMonthNov": "November",
    "booking.calMonthDec": "December",
    "booking.calDayMon": "Mon",
    "booking.calDayTue": "Tue",
    "booking.calDayWed": "Wed",
    "booking.calDayThu": "Thu",
    "booking.calDayFri": "Fri",
    "booking.calDaySat": "Sat",
    "booking.calDaySun": "Sun",

    "gallery.eyebrow": "Dalmatian Coast",
    "gallery.title": "Gallery",
    "gallery.description": "Explore our Dalmatian coast hideaway — from azure waters and stone terraces to cozy interiors.",
    "gallery.catAll": "All Photos",
    "gallery.catAerial": "Aerial Views",
    "gallery.catCoast": "Sea & Coast",
    "gallery.catExterior": "Exterior",
    "gallery.catTerrace": "Terrace",
    "gallery.catInterior": "Interior",
    "gallery.emptyCategory": "No images in this category.",
  },

  hr: {
    "nav.about": "O nama",
    "nav.gallery": "Galerija",
    "nav.location": "Lokacija",
    "nav.booking": "Rezervacija",
    "nav.reviews": "Recenzije",
    "nav.contact": "Kontakt",
    "nav.menu": "Izbornik",
    "footer.rights": "Sva prava pridržana.",
    "footer.builtBy": "Izradila Mihaela MJ",

    "home.heroAlt": "Pogled iz zraka na nekretninu na dalmatinskoj obali",
    "home.heroSubtitle": "Vaš bijeg uz more. Okruženi azurnim vodama.",
    "home.bookNow": "Rezervirajte",
    "home.featuresEyebrow": "Kuća na dalmatinskoj obali",
    "home.featuresTitle": "Savršeno mjesto za odmor i opuštanje",
    "home.featuresParagraph": "Prekrasna kuća na dalmatinskoj obali, okružena morem s gotovo svih strana. Uživajte u kristalno čistom moru, mirnoj lokaciji i nezaboravnim zalascima sunca.",
    "home.featureSeaView": "Pogled na more",
    "home.featurePeaceful": "Mirna lokacija",
    "home.featureEquipped": "Potpuno opremljena",
    "home.featureWifi": "WiFi i parking",
    "home.viewGallery": "Pogledajte galeriju →",
    "home.pillBeach": "Plaža u blizini",
    "home.pillKitchen": "Potpuno opremljena kuhinja",
    "home.pillTerrace": "Terasa s pogledom",
    "home.pillSunset": "Zalasci sunca",

    "strip.eyebrow": "Od dosadašnjih gostiju",
    "strip.heading": "Što gosti kažu",
    "strip.readAll": "Pročitajte sve recenzije →",

    "about.title": "O kući",
    "about.subtitle": "Vaš savršeni odmor na dalmatinskoj obali",
    "about.imageAlt": "Pregled kuće",
    "about.welcomeTitle": "Dobrodošli u raj",
    "about.welcomeParagraph": "Smještena na osamljenom poluotoku na dalmatinskoj obali, naša kuća nudi jedinstveno utočište okruženo kristalno bistrim azurnim vodama s gotovo svih strana. Ovaj skriveni dragulj pruža savršen bijeg od svakodnevice, spajajući mir prirode s modernim udobnostima.",
    "about.featuresTitle": "Značajke nekretnine",
    "about.featureBedrooms": "3 spavaće sobe, prima do 6 gostiju",
    "about.featureBathrooms": "2 kupaonice s modernim sanitarijama",
    "about.featureKitchen": "Potpuno opremljena kuhinja",
    "about.featureLiving": "Prostrani dnevni boravak",
    "about.featureTerrace": "Vanjska terasa s pogledom na more",
    "about.featureParking": "Privatno parkirno mjesto",
    "about.amenitiesTitle": "Sadržaji",
    "about.amenityAcHeat": "Klima i grijanje",
    "about.amenityWifi": "Brzi WiFi",
    "about.amenityTv": "TV s plosnatim zaslonom",
    "about.amenityBbq": "Roštilj",
    "about.amenityBeach": "Pristup plaži",
    "about.amenityLinens": "Posteljina i ručnici osigurani",
    "about.locationTitle": "Lokacija",
    "about.locationP1": "Kuća se nalazi u jednom od najljepših i najmirnijih dijelova dalmatinske obale. Okruženi morem s gotovo svih strana, budit ćete se uz nezaboravne poglede i umirujući zvuk valova.",
    "about.locationP2": "Unatoč osamljenom dojmu, lokalni sadržaji uključujući restorane, trgovine i atrakcije nalaze se samo kratku vožnju daleko. Nekretnina nudi savršenu ravnotežu privatnosti i praktičnosti.",
    "about.bookCta": "Rezervirajte boravak",

    "location.title": "Lokacija",
    "location.subtitle": "Otkrijte ljepotu dalmatinske obale",
    "location.imageAlt": "Pogled iz zraka na lokaciju",
    "location.gettingHereTitle": "Kako doći",
    "location.addressLabel": "Adresa nekretnine",
    "location.gpsLabel": "GPS koordinate:",
    "location.openMaps": "📍 Otvori u Google Mapama",
    "location.introPara": "Naša kuća nalazi se u Veloj Luci na prekrasnom otoku Korčuli, jednom od najljepših jadranskih otoka u Hrvatskoj. Nekretnina je lako dostupna iz glavnih hrvatskih gradova i zračnih luka.",
    "location.airportLabel": "Najbliža zračna luka:",
    "location.airportValue": "Zračna luka Split (oko 2 sata vožnje + trajekt)",
    "location.ferryLabel": "Trajektom:",
    "location.ferryValue": "Redoviti trajekt iz Splita za Velu Luku (2.5-3 sata)",
    "location.carLabel": "Automobilom:",
    "location.carValue": "Privatni parking dostupan na lokaciji",
    "location.dubrovnikLabel": "Iz Dubrovnika:",
    "location.dubrovnikValue": "Dostupne su i trajektne veze",
    "location.attractionsTitle": "Atrakcije u blizini",
    "location.natureBeachesTitle": "Priroda i plaže",
    "location.natureBullet1": "Netaknute plaže (pješice)",
    "location.natureBullet2": "Kristalno čista mjesta za kupanje",
    "location.natureBullet3": "Pješačke staze s pogledom na more",
    "location.natureBullet4": "Mjesta za ronjenje i snorkeling",
    "location.localAmenitiesTitle": "Lokalni sadržaji",
    "location.localBullet1": "Tradicionalni dalmatinski restorani",
    "location.localBullet2": "Lokalne tržnice i trgovine",
    "location.localBullet3": "Povijesni gradovi i sela",
    "location.localBullet4": "Vodeni sportovi i najam brodova",
    "location.mapTitle": "Karta",
    "location.mapCaption": "Kliknite na kartu za otvaranje u Google Mapama radi navigacije",
    "location.aboutVlTitle": "O Veloj Luci i Korčuli",
    "location.aboutVlP1": "Vela Luka je šarmantan gradić na zapadnom dijelu otoka Korčule, poznat po prekrasnom zaljevu, kristalno bistrom moru i autentičnoj mediteranskoj atmosferi. Otok Korčula slavan je po prekrasnim zalascima sunca, svježim morskim plodovima i toploj klimi.",
    "location.aboutVlP2": "Ljetni mjeseci (lipanj-rujan) savršeni su za kupanje i vodene aktivnosti, dok proljeće i jesen nude blaže vrijeme idealno za istraživanje. Mjesto nudi brojne restorane, kafiće i lokalne tržnice gdje možete iskusiti autentičnu dalmatinsku kulturu.",
    "location.aboutVlP3": "Ne propustite posjetiti čuvenu staru jezgru Korčule, lokalne vinarije i obližnje otoke. Područje je savršeno za jedrenje, ronjenje i uživanje u mediteranskom načinu života.",

    "reviews.eyebrow": "Od dosadašnjih gostiju",
    "reviews.title": "Recenzije",
    "reviews.description": "Što su gosti rekli nakon boravka u kući Housey, Vela Luka.",
    "reviews.emptyState": "Još nema recenzija — provjerite uskoro.",
    "reviews.readOnSource": "Pročitajte na {source} →",

    "contact.title": "Kontaktirajte nas",
    "contact.subtitle": "Imate pitanja? Rado ćemo vas čuti.",
    "contact.getInTouch": "Stupite u kontakt",
    "contact.address": "Adresa",
    "contact.emailLabel": "E-mail",
    "contact.phoneLabel": "Telefon",
    "contact.responseTime": "Vrijeme odgovora",
    "contact.responseTimeValue": "Obično odgovaramo unutar 24 sata",
    "contact.viewOnMap": "📍 Pogledaj na karti →",
    "contact.officeHours": "Radno vrijeme",
    "contact.followUs": "Pratite nas",
    "contact.weekdaysLabel": "Ponedjeljak - Petak",
    "contact.weekdaysHours": "9:00 - 18:00",
    "contact.saturdayLabel": "Subota",
    "contact.saturdayHours": "10:00 - 16:00",
    "contact.sundayLabel": "Nedjelja",
    "contact.closed": "Zatvoreno",
    "contact.sendMessage": "Pošaljite nam poruku",
    "contact.thankYou": "Hvala na poruci! Javit ćemo vam se uskoro.",
    "contact.nameLabel": "Ime *",
    "contact.contactEmailLabel": "E-mail *",
    "contact.subjectLabel": "Predmet *",
    "contact.messageLabel": "Poruka *",
    "contact.placeholderName": "Vaše ime",
    "contact.placeholderEmail": "vas@email.com",
    "contact.placeholderSubject": "O čemu se radi?",
    "contact.placeholderMessage": "Vaša poruka...",
    "contact.sending": "Slanje...",
    "contact.sendBtn": "Pošalji poruku",
    "contact.errNameMin": "Ime mora imati najmanje 2 znaka",
    "contact.errEmail": "Neispravna e-mail adresa",
    "contact.errSubjectReq": "Predmet je obavezan",
    "contact.errMessageMin": "Poruka mora imati najmanje 10 znakova",
    "contact.alertFailed": "Slanje poruke nije uspjelo. Pokušajte ponovo ili nam pišite izravno e-mailom.",

    "booking.title": "Rezervirajte boravak",
    "booking.subtitle": "Ispunite obrazac ispod i ubrzo ćemo vam se javiti za potvrdu rezervacije.",
    "booking.pricingTitle": "Cijene i detalji",
    "booking.peakSeason": "Glavna sezona (lip-ruj)",
    "booking.midSeason": "Srednja sezona (tra-svi, lis)",
    "booking.lowSeason": "Niska sezona (stu-ožu)",
    "booking.pricingPeakValue": "€270/noć",
    "booking.pricingMidValue": "€220/noć",
    "booking.pricingLowValue": "€180/noć",
    "booking.minStay": "✓ Minimalni boravak: 5 noći",
    "booking.maxCapacity": "✓ Maksimalan kapacitet: 2 gosta",
    "booking.checkInHours": "✓ Dolazak: 16:00",
    "booking.checkOutHours": "✓ Odlazak: 10:00",
    "booking.includedTitle": "Što je uključeno",
    "booking.amenityKitchen": "Potpuno opremljena kuhinja",
    "booking.amenityWifiTv": "WiFi i TV",
    "booking.amenityAc": "Klima uređaj",
    "booking.amenityParking": "Privatni parking",
    "booking.amenityTerrace": "Vanjska terasa",
    "booking.amenityBbq": "Roštilj",
    "booking.amenityBeach": "Pristup plaži",
    "booking.amenityLinens": "Posteljina i ručnici",
    "booking.reservationRequestTitle": "Zahtjev za rezervaciju",
    "booking.thankYouToast": "Hvala vam! Primili smo vaš zahtjev za rezervaciju i ubrzo ćemo vas kontaktirati.",
    "booking.selectDatesLabel": "Odaberite datume *",
    "booking.minStayError": "Minimalni boravak je 5 noći.",
    "booking.unavailableRangeError": "Odabrani raspon uključuje nedostupne datume. Molimo odaberite druge datume.",
    "booking.selectDatesError": "Molimo odaberite datume dolaska i odlaska.",
    "booking.failedAlert": "Slanje zahtjeva nije uspjelo. Pokušajte ponovo ili nas kontaktirajte izravno.",
    "booking.clickCheckIn": "👆 Kliknite datum za odabir dolaska",
    "booking.clickCheckOut": "👆 Sada odaberite odlazak (min. 5 noći)",
    "booking.legendSelected": "Odabrano",
    "booking.legendRange": "Raspon",
    "booking.legendUnavailable": "Nedostupno",
    "booking.calPrev": "← Prethodni",
    "booking.calNext": "Sljedeći →",
    "booking.checkInRow": "Dolazak:",
    "booking.checkOutRow": "Odlazak:",
    "booking.durationRow": "Trajanje:",
    "booking.nightsSuffix": "noći",
    "booking.nightSuffix": "noć",
    "booking.nameLabel": "Ime i prezime *",
    "booking.emailLabel": "E-mail adresa *",
    "booking.phoneLabel": "Broj telefona *",
    "booking.guestsLabel": "Broj gostiju *",
    "booking.guestSelectPlaceholder": "Odaberite...",
    "booking.guest1": "1 gost",
    "booking.guest2": "2 gosta",
    "booking.messageLabel": "Dodatna poruka (neobavezno)",
    "booking.placeholderName": "Ivan Horvat",
    "booking.placeholderEmail": "ivan@example.com",
    "booking.placeholderPhone": "+385 91 234 5678",
    "booking.placeholderMessage": "Posebni zahtjevi ili pitanja?",
    "booking.submitting": "Slanje...",
    "booking.submitBtn": "Pošalji zahtjev za rezervaciju",
    "booking.tooltipMinNights": "Min. 5 noći",
    "booking.tooltipUnavailable": "Nedostupno",
    "booking.errNameMin": "Ime mora imati najmanje 2 znaka",
    "booking.errEmail": "Neispravna e-mail adresa",
    "booking.errPhoneMin": "Broj telefona je obavezan",
    "booking.errGuestsReq": "Broj gostiju je obavezan",
    "booking.calMonthJan": "Siječanj",
    "booking.calMonthFeb": "Veljača",
    "booking.calMonthMar": "Ožujak",
    "booking.calMonthApr": "Travanj",
    "booking.calMonthMay": "Svibanj",
    "booking.calMonthJun": "Lipanj",
    "booking.calMonthJul": "Srpanj",
    "booking.calMonthAug": "Kolovoz",
    "booking.calMonthSep": "Rujan",
    "booking.calMonthOct": "Listopad",
    "booking.calMonthNov": "Studeni",
    "booking.calMonthDec": "Prosinac",
    "booking.calDayMon": "Pon",
    "booking.calDayTue": "Uto",
    "booking.calDayWed": "Sri",
    "booking.calDayThu": "Čet",
    "booking.calDayFri": "Pet",
    "booking.calDaySat": "Sub",
    "booking.calDaySun": "Ned",

    "gallery.eyebrow": "Dalmatinska obala",
    "gallery.title": "Galerija",
    "gallery.description": "Istražite naše utočište na dalmatinskoj obali — od azurnih voda i kamenih terasa do udobnih interijera.",
    "gallery.catAll": "Sve fotografije",
    "gallery.catAerial": "Iz zraka",
    "gallery.catCoast": "More i obala",
    "gallery.catExterior": "Eksterijer",
    "gallery.catTerrace": "Terasa",
    "gallery.catInterior": "Interijer",
    "gallery.emptyCategory": "Nema fotografija u ovoj kategoriji.",
  },

  de: {
    "nav.about": "Über uns",
    "nav.gallery": "Galerie",
    "nav.location": "Lage",
    "nav.booking": "Buchen",
    "nav.reviews": "Bewertungen",
    "nav.contact": "Kontakt",
    "nav.menu": "Menü",
    "footer.rights": "Alle Rechte vorbehalten.",
    "footer.builtBy": "Erstellt von Mihaela MJ",

    "home.heroAlt": "Luftaufnahme der Immobilie an der dalmatinischen Küste",
    "home.heroSubtitle": "Ihr Rückzugsort am Meer. Umgeben von azurblauem Wasser.",
    "home.bookNow": "Jetzt buchen",
    "home.featuresEyebrow": "Haus an der dalmatinischen Küste",
    "home.featuresTitle": "Der perfekte Ort zum Entspannen",
    "home.featuresParagraph": "Wunderschönes Haus an der dalmatinischen Küste, fast vollständig vom Meer umgeben. Genießen Sie kristallklares Wasser, ruhige Lage und atemberaubende Sonnenuntergänge.",
    "home.featureSeaView": "Meerblick",
    "home.featurePeaceful": "Ruhige Lage",
    "home.featureEquipped": "Voll ausgestattet",
    "home.featureWifi": "WLAN & Parkplatz",
    "home.viewGallery": "Galerie ansehen →",
    "home.pillBeach": "Strand in der Nähe",
    "home.pillKitchen": "Voll ausgestattete Küche",
    "home.pillTerrace": "Terrasse mit Aussicht",
    "home.pillSunset": "Sonnenuntergänge",

    "strip.eyebrow": "Von bisherigen Gästen",
    "strip.heading": "Was Gäste sagen",
    "strip.readAll": "Alle Bewertungen lesen →",

    "about.title": "Über das Haus",
    "about.subtitle": "Ihr perfekter Rückzugsort an der dalmatinischen Küste",
    "about.imageAlt": "Hausansicht",
    "about.welcomeTitle": "Willkommen im Paradies",
    "about.welcomeParagraph": "Eingebettet auf einer abgeschiedenen Halbinsel an der dalmatinischen Küste bietet unser Haus einen einzigartigen Rückzugsort, fast vollständig umgeben von kristallklarem azurblauem Wasser. Dieses verborgene Juwel ist die perfekte Flucht aus dem Alltag und verbindet die Ruhe der Natur mit modernem Komfort.",
    "about.featuresTitle": "Ausstattung der Immobilie",
    "about.featureBedrooms": "3 Schlafzimmer, Platz für bis zu 6 Gäste",
    "about.featureBathrooms": "2 Badezimmer mit moderner Ausstattung",
    "about.featureKitchen": "Voll ausgestattete Küche",
    "about.featureLiving": "Geräumiger Wohnbereich",
    "about.featureTerrace": "Außenterrasse mit Meerblick",
    "about.featureParking": "Privater Parkplatz",
    "about.amenitiesTitle": "Annehmlichkeiten",
    "about.amenityAcHeat": "Klimaanlage & Heizung",
    "about.amenityWifi": "Schnelles WLAN",
    "about.amenityTv": "Flachbildfernseher",
    "about.amenityBbq": "Grill",
    "about.amenityBeach": "Strandzugang",
    "about.amenityLinens": "Bettwäsche und Handtücher inklusive",
    "about.locationTitle": "Die Lage",
    "about.locationP1": "Das Haus befindet sich in einer der schönsten und ruhigsten Gegenden der dalmatinischen Küste. Fast vollständig vom Meer umgeben, erwachen Sie zu atemberaubenden Ausblicken und dem beruhigenden Klang der Wellen.",
    "about.locationP2": "Trotz des abgeschiedenen Charakters sind lokale Annehmlichkeiten wie Restaurants, Geschäfte und Sehenswürdigkeiten nur eine kurze Fahrt entfernt. Die Immobilie bietet die perfekte Balance zwischen Privatsphäre und Komfort.",
    "about.bookCta": "Aufenthalt buchen",

    "location.title": "Lage",
    "location.subtitle": "Entdecken Sie die Schönheit der dalmatinischen Küste",
    "location.imageAlt": "Luftaufnahme der Lage",
    "location.gettingHereTitle": "Anreise",
    "location.addressLabel": "Adresse der Unterkunft",
    "location.gpsLabel": "GPS-Koordinaten:",
    "location.openMaps": "📍 In Google Maps öffnen",
    "location.introPara": "Unser Haus liegt in Vela Luka auf der wunderschönen Insel Korčula, einer der schönsten Adriainseln Kroatiens. Die Unterkunft ist von den wichtigsten kroatischen Städten und Flughäfen leicht erreichbar.",
    "location.airportLabel": "Nächster Flughafen:",
    "location.airportValue": "Flughafen Split (ca. 2 Stunden Fahrt + Fähre)",
    "location.ferryLabel": "Mit der Fähre:",
    "location.ferryValue": "Regelmäßige Fähre von Split nach Vela Luka (2,5-3 Stunden)",
    "location.carLabel": "Mit dem Auto:",
    "location.carValue": "Privater Parkplatz vor Ort verfügbar",
    "location.dubrovnikLabel": "Von Dubrovnik:",
    "location.dubrovnikValue": "Auch Fährverbindungen verfügbar",
    "location.attractionsTitle": "Sehenswürdigkeiten in der Nähe",
    "location.natureBeachesTitle": "Natur & Strände",
    "location.natureBullet1": "Unberührte Strände (zu Fuß erreichbar)",
    "location.natureBullet2": "Kristallklare Badestellen",
    "location.natureBullet3": "Wanderwege mit Meerblick",
    "location.natureBullet4": "Schnorchel- und Tauchplätze",
    "location.localAmenitiesTitle": "Lokale Annehmlichkeiten",
    "location.localBullet1": "Traditionelle dalmatinische Restaurants",
    "location.localBullet2": "Lokale Märkte und Geschäfte",
    "location.localBullet3": "Historische Städte und Dörfer",
    "location.localBullet4": "Wassersport und Bootsverleih",
    "location.mapTitle": "Karte",
    "location.mapCaption": "Klicken Sie auf die Karte, um sie in Google Maps für Wegbeschreibungen zu öffnen",
    "location.aboutVlTitle": "Über Vela Luka & Korčula",
    "location.aboutVlP1": "Vela Luka ist eine charmante Stadt am westlichen Ende der Insel Korčula, bekannt für ihre wunderschöne Bucht, das kristallklare Wasser und die authentische mediterrane Atmosphäre. Die Insel Korčula ist berühmt für ihre atemberaubenden Sonnenuntergänge, frische Meeresfrüchte und ihr warmes Klima.",
    "location.aboutVlP2": "Die Sommermonate (Juni-September) eignen sich perfekt zum Schwimmen und für Wasseraktivitäten, während Frühling und Herbst mildes Wetter zum Erkunden bieten. Die Stadt bietet zahlreiche Restaurants, Cafés und lokale Märkte, in denen Sie die authentische dalmatinische Kultur erleben können.",
    "location.aboutVlP3": "Verpassen Sie nicht den Besuch der berühmten Altstadt von Korčula, lokaler Weingüter und nahegelegener Inseln. Die Gegend ist perfekt zum Segeln, Tauchen und Genießen des mediterranen Lebensstils.",

    "reviews.eyebrow": "Von bisherigen Gästen",
    "reviews.title": "Bewertungen",
    "reviews.description": "Was Gäste nach ihrem Aufenthalt im Housey, Vela Luka, gesagt haben.",
    "reviews.emptyState": "Noch keine Bewertungen — schauen Sie bald wieder vorbei.",
    "reviews.readOnSource": "Auf {source} lesen →",

    "contact.title": "Kontakt",
    "contact.subtitle": "Haben Sie Fragen? Wir freuen uns auf Ihre Nachricht.",
    "contact.getInTouch": "Kontakt aufnehmen",
    "contact.address": "Adresse",
    "contact.emailLabel": "E-Mail",
    "contact.phoneLabel": "Telefon",
    "contact.responseTime": "Antwortzeit",
    "contact.responseTimeValue": "Wir antworten in der Regel innerhalb von 24 Stunden",
    "contact.viewOnMap": "📍 Auf der Karte anzeigen →",
    "contact.officeHours": "Öffnungszeiten",
    "contact.followUs": "Folgen Sie uns",
    "contact.weekdaysLabel": "Montag - Freitag",
    "contact.weekdaysHours": "9:00 - 18:00",
    "contact.saturdayLabel": "Samstag",
    "contact.saturdayHours": "10:00 - 16:00",
    "contact.sundayLabel": "Sonntag",
    "contact.closed": "Geschlossen",
    "contact.sendMessage": "Senden Sie uns eine Nachricht",
    "contact.thankYou": "Vielen Dank für Ihre Nachricht! Wir melden uns bald.",
    "contact.nameLabel": "Name *",
    "contact.contactEmailLabel": "E-Mail *",
    "contact.subjectLabel": "Betreff *",
    "contact.messageLabel": "Nachricht *",
    "contact.placeholderName": "Ihr Name",
    "contact.placeholderEmail": "ihre@email.com",
    "contact.placeholderSubject": "Worum geht es?",
    "contact.placeholderMessage": "Ihre Nachricht...",
    "contact.sending": "Wird gesendet...",
    "contact.sendBtn": "Nachricht senden",
    "contact.errNameMin": "Der Name muss mindestens 2 Zeichen lang sein",
    "contact.errEmail": "Ungültige E-Mail-Adresse",
    "contact.errSubjectReq": "Betreff ist erforderlich",
    "contact.errMessageMin": "Nachricht muss mindestens 10 Zeichen lang sein",
    "contact.alertFailed": "Nachricht konnte nicht gesendet werden. Bitte erneut versuchen oder direkt per E-Mail kontaktieren.",

    "booking.title": "Aufenthalt buchen",
    "booking.subtitle": "Füllen Sie das Formular aus und wir melden uns in Kürze zur Bestätigung Ihrer Reservierung.",
    "booking.pricingTitle": "Preise & Details",
    "booking.peakSeason": "Hochsaison (Jun-Sep)",
    "booking.midSeason": "Nebensaison (Apr-Mai, Okt)",
    "booking.lowSeason": "Niedrige Saison (Nov-Mär)",
    "booking.pricingPeakValue": "€270/Nacht",
    "booking.pricingMidValue": "€220/Nacht",
    "booking.pricingLowValue": "€180/Nacht",
    "booking.minStay": "✓ Mindestaufenthalt: 5 Nächte",
    "booking.maxCapacity": "✓ Maximale Belegung: 2 Gäste",
    "booking.checkInHours": "✓ Check-in: 16:00",
    "booking.checkOutHours": "✓ Check-out: 10:00",
    "booking.includedTitle": "Was ist inbegriffen",
    "booking.amenityKitchen": "Voll ausgestattete Küche",
    "booking.amenityWifiTv": "WLAN & TV",
    "booking.amenityAc": "Klimaanlage",
    "booking.amenityParking": "Privater Parkplatz",
    "booking.amenityTerrace": "Außenterrasse",
    "booking.amenityBbq": "Grill",
    "booking.amenityBeach": "Strandzugang",
    "booking.amenityLinens": "Bettwäsche und Handtücher",
    "booking.reservationRequestTitle": "Reservierungsanfrage",
    "booking.thankYouToast": "Vielen Dank! Wir haben Ihre Buchungsanfrage erhalten und melden uns bald.",
    "booking.selectDatesLabel": "Daten auswählen *",
    "booking.minStayError": "Mindestaufenthalt sind 5 Nächte.",
    "booking.unavailableRangeError": "Der gewählte Zeitraum enthält nicht verfügbare Daten. Bitte wählen Sie andere Daten.",
    "booking.selectDatesError": "Bitte wählen Sie An- und Abreisedaten aus.",
    "booking.failedAlert": "Buchungsanfrage konnte nicht gesendet werden. Bitte erneut versuchen oder direkt kontaktieren.",
    "booking.clickCheckIn": "👆 Klicken Sie auf ein Datum für den Check-in",
    "booking.clickCheckOut": "👆 Jetzt Check-out auswählen (mind. 5 Nächte)",
    "booking.legendSelected": "Ausgewählt",
    "booking.legendRange": "Zeitraum",
    "booking.legendUnavailable": "Nicht verfügbar",
    "booking.calPrev": "← Vorherige",
    "booking.calNext": "Nächste →",
    "booking.checkInRow": "Check-in:",
    "booking.checkOutRow": "Check-out:",
    "booking.durationRow": "Dauer:",
    "booking.nightsSuffix": "Nächte",
    "booking.nightSuffix": "Nacht",
    "booking.nameLabel": "Vollständiger Name *",
    "booking.emailLabel": "E-Mail-Adresse *",
    "booking.phoneLabel": "Telefonnummer *",
    "booking.guestsLabel": "Anzahl der Gäste *",
    "booking.guestSelectPlaceholder": "Auswählen...",
    "booking.guest1": "1 Gast",
    "booking.guest2": "2 Gäste",
    "booking.messageLabel": "Zusätzliche Nachricht (optional)",
    "booking.placeholderName": "Max Mustermann",
    "booking.placeholderEmail": "max@example.com",
    "booking.placeholderPhone": "+49 30 1234 5678",
    "booking.placeholderMessage": "Besondere Wünsche oder Fragen?",
    "booking.submitting": "Wird gesendet...",
    "booking.submitBtn": "Buchungsanfrage senden",
    "booking.tooltipMinNights": "Mind. 5 Nächte",
    "booking.tooltipUnavailable": "Nicht verfügbar",
    "booking.errNameMin": "Der Name muss mindestens 2 Zeichen lang sein",
    "booking.errEmail": "Ungültige E-Mail-Adresse",
    "booking.errPhoneMin": "Telefonnummer ist erforderlich",
    "booking.errGuestsReq": "Anzahl der Gäste ist erforderlich",
    "booking.calMonthJan": "Januar",
    "booking.calMonthFeb": "Februar",
    "booking.calMonthMar": "März",
    "booking.calMonthApr": "April",
    "booking.calMonthMay": "Mai",
    "booking.calMonthJun": "Juni",
    "booking.calMonthJul": "Juli",
    "booking.calMonthAug": "August",
    "booking.calMonthSep": "September",
    "booking.calMonthOct": "Oktober",
    "booking.calMonthNov": "November",
    "booking.calMonthDec": "Dezember",
    "booking.calDayMon": "Mo",
    "booking.calDayTue": "Di",
    "booking.calDayWed": "Mi",
    "booking.calDayThu": "Do",
    "booking.calDayFri": "Fr",
    "booking.calDaySat": "Sa",
    "booking.calDaySun": "So",

    "gallery.eyebrow": "Dalmatinische Küste",
    "gallery.title": "Galerie",
    "gallery.description": "Entdecken Sie unser Refugium an der dalmatinischen Küste — von azurblauem Wasser und Steinterrassen bis hin zu gemütlichen Innenräumen.",
    "gallery.catAll": "Alle Fotos",
    "gallery.catAerial": "Luftaufnahmen",
    "gallery.catCoast": "Meer & Küste",
    "gallery.catExterior": "Außenbereich",
    "gallery.catTerrace": "Terrasse",
    "gallery.catInterior": "Innenbereich",
    "gallery.emptyCategory": "Keine Bilder in dieser Kategorie.",
  },

  it: {
    "nav.about": "Chi siamo",
    "nav.gallery": "Galleria",
    "nav.location": "Posizione",
    "nav.booking": "Prenota",
    "nav.reviews": "Recensioni",
    "nav.contact": "Contatti",
    "nav.menu": "Menù",
    "footer.rights": "Tutti i diritti riservati.",
    "footer.builtBy": "Realizzato da Mihaela MJ",

    "home.heroAlt": "Vista aerea della proprietà sulla costa dalmata",
    "home.heroSubtitle": "La tua fuga sul mare. Circondato da acque azzurre.",
    "home.bookNow": "Prenota ora",
    "home.featuresEyebrow": "Casa sulla costa dalmata",
    "home.featuresTitle": "Il posto perfetto per rilassarsi",
    "home.featuresParagraph": "Splendida casa sulla costa dalmata, circondata dal mare su quasi tutti i lati. Goditi acque cristalline, posizione tranquilla e tramonti mozzafiato.",
    "home.featureSeaView": "Vista mare",
    "home.featurePeaceful": "Posizione tranquilla",
    "home.featureEquipped": "Completamente attrezzata",
    "home.featureWifi": "WiFi e parcheggio",
    "home.viewGallery": "Vedi la galleria →",
    "home.pillBeach": "Spiaggia vicina",
    "home.pillKitchen": "Cucina completamente attrezzata",
    "home.pillTerrace": "Terrazza con vista",
    "home.pillSunset": "Tramonti",

    "strip.eyebrow": "Dai nostri ospiti",
    "strip.heading": "Cosa dicono gli ospiti",
    "strip.readAll": "Leggi tutte le recensioni →",

    "about.title": "Sulla casa",
    "about.subtitle": "La tua vacanza perfetta sulla costa dalmata",
    "about.imageAlt": "Vista della casa",
    "about.welcomeTitle": "Benvenuti in paradiso",
    "about.welcomeParagraph": "Adagiata su una penisola appartata sulla costa dalmata, la nostra casa offre un rifugio unico circondato da acque azzurre cristalline su quasi tutti i lati. Questa gemma nascosta è la fuga perfetta dalla vita quotidiana, unendo la tranquillità della natura ai comfort moderni.",
    "about.featuresTitle": "Caratteristiche della proprietà",
    "about.featureBedrooms": "3 camere da letto, fino a 6 ospiti",
    "about.featureBathrooms": "2 bagni con accessori moderni",
    "about.featureKitchen": "Cucina completamente attrezzata",
    "about.featureLiving": "Ampio soggiorno",
    "about.featureTerrace": "Terrazza esterna con vista mare",
    "about.featureParking": "Posto auto privato",
    "about.amenitiesTitle": "Servizi",
    "about.amenityAcHeat": "Aria condizionata e riscaldamento",
    "about.amenityWifi": "WiFi veloce",
    "about.amenityTv": "TV a schermo piatto",
    "about.amenityBbq": "Barbecue",
    "about.amenityBeach": "Accesso alla spiaggia",
    "about.amenityLinens": "Biancheria e asciugamani inclusi",
    "about.locationTitle": "La posizione",
    "about.locationP1": "La casa si trova in una delle zone più belle e tranquille della costa dalmata. Circondata dal mare su quasi tutti i lati, ti sveglierai con viste mozzafiato e il suono rilassante delle onde.",
    "about.locationP2": "Nonostante l'atmosfera appartata, i servizi locali tra cui ristoranti, negozi e attrazioni sono a breve distanza in auto. La proprietà offre il perfetto equilibrio tra privacy e comodità.",
    "about.bookCta": "Prenota il soggiorno",

    "location.title": "Posizione",
    "location.subtitle": "Scopri la bellezza della costa dalmata",
    "location.imageAlt": "Vista aerea della posizione",
    "location.gettingHereTitle": "Come arrivare",
    "location.addressLabel": "Indirizzo della proprietà",
    "location.gpsLabel": "Coordinate GPS:",
    "location.openMaps": "📍 Apri in Google Maps",
    "location.introPara": "La nostra casa si trova a Vela Luka, sulla splendida isola di Korčula, una delle più belle isole adriatiche della Croazia. La proprietà è facilmente raggiungibile dalle principali città e aeroporti croati.",
    "location.airportLabel": "Aeroporto più vicino:",
    "location.airportValue": "Aeroporto di Spalato (circa 2 ore di auto + traghetto)",
    "location.ferryLabel": "In traghetto:",
    "location.ferryValue": "Traghetto regolare da Spalato a Vela Luka (2,5-3 ore)",
    "location.carLabel": "In auto:",
    "location.carValue": "Parcheggio privato disponibile in loco",
    "location.dubrovnikLabel": "Da Dubrovnik:",
    "location.dubrovnikValue": "Sono disponibili anche collegamenti in traghetto",
    "location.attractionsTitle": "Attrazioni nelle vicinanze",
    "location.natureBeachesTitle": "Natura e spiagge",
    "location.natureBullet1": "Spiagge incontaminate (a piedi)",
    "location.natureBullet2": "Punti balneari cristallini",
    "location.natureBullet3": "Sentieri escursionistici con vista mare",
    "location.natureBullet4": "Punti per snorkeling e immersioni",
    "location.localAmenitiesTitle": "Servizi locali",
    "location.localBullet1": "Ristoranti dalmati tradizionali",
    "location.localBullet2": "Mercati e negozi locali",
    "location.localBullet3": "Città e villaggi storici",
    "location.localBullet4": "Sport acquatici e noleggio barche",
    "location.mapTitle": "Mappa",
    "location.mapCaption": "Clicca sulla mappa per aprirla in Google Maps e ottenere indicazioni",
    "location.aboutVlTitle": "Su Vela Luka e Korčula",
    "location.aboutVlP1": "Vela Luka è una cittadina affascinante all'estremità occidentale dell'isola di Korčula, nota per la sua splendida baia, le acque cristalline e l'autentica atmosfera mediterranea. L'isola di Korčula è famosa per i suoi tramonti mozzafiato, i frutti di mare freschi e il clima mite.",
    "location.aboutVlP2": "I mesi estivi (giugno-settembre) sono perfetti per nuotare e per attività acquatiche, mentre primavera e autunno offrono un clima più mite ideale per esplorare. La cittadina offre numerosi ristoranti, caffè e mercati locali dove vivere l'autentica cultura dalmata.",
    "location.aboutVlP3": "Non perdere il famoso centro storico di Korčula, le cantine locali e le isole vicine. La zona è perfetta per la vela, le immersioni e per godersi lo stile di vita mediterraneo.",

    "reviews.eyebrow": "Dai nostri ospiti",
    "reviews.title": "Recensioni",
    "reviews.description": "Cosa hanno detto gli ospiti dopo aver soggiornato a Housey, Vela Luka.",
    "reviews.emptyState": "Ancora nessuna recensione — torna a trovarci presto.",
    "reviews.readOnSource": "Leggi su {source} →",

    "contact.title": "Contattaci",
    "contact.subtitle": "Hai domande? Ci farebbe piacere sentirti.",
    "contact.getInTouch": "Mettiti in contatto",
    "contact.address": "Indirizzo",
    "contact.emailLabel": "Email",
    "contact.phoneLabel": "Telefono",
    "contact.responseTime": "Tempo di risposta",
    "contact.responseTimeValue": "Di solito rispondiamo entro 24 ore",
    "contact.viewOnMap": "📍 Vedi sulla mappa →",
    "contact.officeHours": "Orari",
    "contact.followUs": "Seguici",
    "contact.weekdaysLabel": "Lunedì - Venerdì",
    "contact.weekdaysHours": "9:00 - 18:00",
    "contact.saturdayLabel": "Sabato",
    "contact.saturdayHours": "10:00 - 16:00",
    "contact.sundayLabel": "Domenica",
    "contact.closed": "Chiuso",
    "contact.sendMessage": "Inviaci un messaggio",
    "contact.thankYou": "Grazie per il tuo messaggio! Ti risponderemo presto.",
    "contact.nameLabel": "Nome *",
    "contact.contactEmailLabel": "Email *",
    "contact.subjectLabel": "Oggetto *",
    "contact.messageLabel": "Messaggio *",
    "contact.placeholderName": "Il tuo nome",
    "contact.placeholderEmail": "tua@email.com",
    "contact.placeholderSubject": "Qual è la tua richiesta?",
    "contact.placeholderMessage": "Il tuo messaggio...",
    "contact.sending": "Invio in corso...",
    "contact.sendBtn": "Invia messaggio",
    "contact.errNameMin": "Il nome deve avere almeno 2 caratteri",
    "contact.errEmail": "Indirizzo email non valido",
    "contact.errSubjectReq": "L'oggetto è obbligatorio",
    "contact.errMessageMin": "Il messaggio deve avere almeno 10 caratteri",
    "contact.alertFailed": "Invio del messaggio fallito. Riprova o scrivici direttamente via email.",

    "booking.title": "Prenota il soggiorno",
    "booking.subtitle": "Compila il modulo qui sotto e ti ricontatteremo a breve per confermare la prenotazione.",
    "booking.pricingTitle": "Prezzi e dettagli",
    "booking.peakSeason": "Alta stagione (giu-set)",
    "booking.midSeason": "Media stagione (apr-mag, ott)",
    "booking.lowSeason": "Bassa stagione (nov-mar)",
    "booking.pricingPeakValue": "€270/notte",
    "booking.pricingMidValue": "€220/notte",
    "booking.pricingLowValue": "€180/notte",
    "booking.minStay": "✓ Soggiorno minimo: 5 notti",
    "booking.maxCapacity": "✓ Capacità massima: 2 ospiti",
    "booking.checkInHours": "✓ Check-in: 16:00",
    "booking.checkOutHours": "✓ Check-out: 10:00",
    "booking.includedTitle": "Cosa è incluso",
    "booking.amenityKitchen": "Cucina completamente attrezzata",
    "booking.amenityWifiTv": "WiFi e TV",
    "booking.amenityAc": "Aria condizionata",
    "booking.amenityParking": "Parcheggio privato",
    "booking.amenityTerrace": "Terrazza esterna",
    "booking.amenityBbq": "Barbecue",
    "booking.amenityBeach": "Accesso alla spiaggia",
    "booking.amenityLinens": "Biancheria e asciugamani",
    "booking.reservationRequestTitle": "Richiesta di prenotazione",
    "booking.thankYouToast": "Grazie! Abbiamo ricevuto la tua richiesta di prenotazione e ti contatteremo presto.",
    "booking.selectDatesLabel": "Seleziona le date *",
    "booking.minStayError": "Il soggiorno minimo è di 5 notti.",
    "booking.unavailableRangeError": "Il periodo selezionato include date non disponibili. Scegli date diverse.",
    "booking.selectDatesError": "Seleziona le date di check-in e check-out.",
    "booking.failedAlert": "Invio della richiesta fallito. Riprova o contattaci direttamente.",
    "booking.clickCheckIn": "👆 Clicca una data per il check-in",
    "booking.clickCheckOut": "👆 Ora seleziona il check-out (min. 5 notti)",
    "booking.legendSelected": "Selezionato",
    "booking.legendRange": "Periodo",
    "booking.legendUnavailable": "Non disponibile",
    "booking.calPrev": "← Precedente",
    "booking.calNext": "Successivo →",
    "booking.checkInRow": "Check-in:",
    "booking.checkOutRow": "Check-out:",
    "booking.durationRow": "Durata:",
    "booking.nightsSuffix": "notti",
    "booking.nightSuffix": "notte",
    "booking.nameLabel": "Nome completo *",
    "booking.emailLabel": "Indirizzo email *",
    "booking.phoneLabel": "Numero di telefono *",
    "booking.guestsLabel": "Numero di ospiti *",
    "booking.guestSelectPlaceholder": "Seleziona...",
    "booking.guest1": "1 ospite",
    "booking.guest2": "2 ospiti",
    "booking.messageLabel": "Messaggio aggiuntivo (facoltativo)",
    "booking.placeholderName": "Mario Rossi",
    "booking.placeholderEmail": "mario@example.com",
    "booking.placeholderPhone": "+39 06 1234 5678",
    "booking.placeholderMessage": "Richieste particolari o domande?",
    "booking.submitting": "Invio in corso...",
    "booking.submitBtn": "Invia richiesta di prenotazione",
    "booking.tooltipMinNights": "Min. 5 notti",
    "booking.tooltipUnavailable": "Non disponibile",
    "booking.errNameMin": "Il nome deve avere almeno 2 caratteri",
    "booking.errEmail": "Indirizzo email non valido",
    "booking.errPhoneMin": "Il numero di telefono è obbligatorio",
    "booking.errGuestsReq": "Il numero di ospiti è obbligatorio",
    "booking.calMonthJan": "Gennaio",
    "booking.calMonthFeb": "Febbraio",
    "booking.calMonthMar": "Marzo",
    "booking.calMonthApr": "Aprile",
    "booking.calMonthMay": "Maggio",
    "booking.calMonthJun": "Giugno",
    "booking.calMonthJul": "Luglio",
    "booking.calMonthAug": "Agosto",
    "booking.calMonthSep": "Settembre",
    "booking.calMonthOct": "Ottobre",
    "booking.calMonthNov": "Novembre",
    "booking.calMonthDec": "Dicembre",
    "booking.calDayMon": "Lun",
    "booking.calDayTue": "Mar",
    "booking.calDayWed": "Mer",
    "booking.calDayThu": "Gio",
    "booking.calDayFri": "Ven",
    "booking.calDaySat": "Sab",
    "booking.calDaySun": "Dom",

    "gallery.eyebrow": "Costa dalmata",
    "gallery.title": "Galleria",
    "gallery.description": "Esplora il nostro rifugio sulla costa dalmata — dalle acque azzurre e terrazze in pietra agli accoglienti interni.",
    "gallery.catAll": "Tutte le foto",
    "gallery.catAerial": "Viste aeree",
    "gallery.catCoast": "Mare e costa",
    "gallery.catExterior": "Esterno",
    "gallery.catTerrace": "Terrazza",
    "gallery.catInterior": "Interno",
    "gallery.emptyCategory": "Nessuna immagine in questa categoria.",
  },

  fr: {
    "nav.about": "À propos",
    "nav.gallery": "Galerie",
    "nav.location": "Emplacement",
    "nav.booking": "Réserver",
    "nav.reviews": "Avis",
    "nav.contact": "Contact",
    "nav.menu": "Menu",
    "footer.rights": "Tous droits réservés.",
    "footer.builtBy": "Réalisé par Mihaela MJ",

    "home.heroAlt": "Vue aérienne de la propriété sur la côte dalmate",
    "home.heroSubtitle": "Votre échappée en bord de mer. Entourée d'eaux azur.",
    "home.bookNow": "Réserver",
    "home.featuresEyebrow": "Maison sur la côte dalmate",
    "home.featuresTitle": "L'endroit parfait pour se détendre",
    "home.featuresParagraph": "Magnifique maison sur la côte dalmate, entourée par la mer sur presque tous les côtés. Profitez d'une eau cristalline, d'un emplacement paisible et de couchers de soleil saisissants.",
    "home.featureSeaView": "Vue sur la mer",
    "home.featurePeaceful": "Emplacement paisible",
    "home.featureEquipped": "Entièrement équipée",
    "home.featureWifi": "WiFi et parking",
    "home.viewGallery": "Voir la galerie →",
    "home.pillBeach": "Plage à proximité",
    "home.pillKitchen": "Cuisine entièrement équipée",
    "home.pillTerrace": "Terrasse avec vue",
    "home.pillSunset": "Couchers de soleil",

    "strip.eyebrow": "Anciens voyageurs",
    "strip.heading": "Ce que disent les voyageurs",
    "strip.readAll": "Lire tous les avis →",

    "about.title": "À propos de la maison",
    "about.subtitle": "Votre escapade parfaite sur la côte dalmate",
    "about.imageAlt": "Vue de la maison",
    "about.welcomeTitle": "Bienvenue au paradis",
    "about.welcomeParagraph": "Nichée sur une péninsule isolée de la côte dalmate, notre maison offre une retraite unique entourée d'eaux azur cristallines sur presque tous les côtés. Ce joyau caché est l'échappée parfaite du quotidien, alliant la tranquillité de la nature au confort moderne.",
    "about.featuresTitle": "Caractéristiques",
    "about.featureBedrooms": "3 chambres, jusqu'à 6 voyageurs",
    "about.featureBathrooms": "2 salles de bain modernes",
    "about.featureKitchen": "Cuisine entièrement équipée",
    "about.featureLiving": "Grand salon",
    "about.featureTerrace": "Terrasse extérieure avec vue mer",
    "about.featureParking": "Place de parking privée",
    "about.amenitiesTitle": "Équipements",
    "about.amenityAcHeat": "Climatisation et chauffage",
    "about.amenityWifi": "WiFi haut débit",
    "about.amenityTv": "Téléviseur écran plat",
    "about.amenityBbq": "Barbecue",
    "about.amenityBeach": "Accès à la plage",
    "about.amenityLinens": "Draps et serviettes fournis",
    "about.locationTitle": "L'emplacement",
    "about.locationP1": "La maison se situe dans l'une des zones les plus belles et paisibles de la côte dalmate. Entouré par la mer sur presque tous les côtés, vous vous réveillerez avec des vues à couper le souffle et le son apaisant des vagues.",
    "about.locationP2": "Malgré son côté retiré, les commodités locales (restaurants, commerces, attractions) ne sont qu'à quelques minutes en voiture. La propriété offre le parfait équilibre entre intimité et praticité.",
    "about.bookCta": "Réserver votre séjour",

    "location.title": "Emplacement",
    "location.subtitle": "Découvrez la beauté de la côte dalmate",
    "location.imageAlt": "Vue aérienne de l'emplacement",
    "location.gettingHereTitle": "Comment venir",
    "location.addressLabel": "Adresse de la propriété",
    "location.gpsLabel": "Coordonnées GPS :",
    "location.openMaps": "📍 Ouvrir dans Google Maps",
    "location.introPara": "Notre maison se trouve à Vela Luka sur la magnifique île de Korčula, l'une des plus belles îles adriatiques de Croatie. La propriété est facilement accessible depuis les principales villes et aéroports croates.",
    "location.airportLabel": "Aéroport le plus proche :",
    "location.airportValue": "Aéroport de Split (env. 2 heures de route + ferry)",
    "location.ferryLabel": "En ferry :",
    "location.ferryValue": "Ferry régulier de Split à Vela Luka (2,5-3 heures)",
    "location.carLabel": "En voiture :",
    "location.carValue": "Parking privé disponible sur place",
    "location.dubrovnikLabel": "Depuis Dubrovnik :",
    "location.dubrovnikValue": "Liaisons en ferry également disponibles",
    "location.attractionsTitle": "Attractions à proximité",
    "location.natureBeachesTitle": "Nature et plages",
    "location.natureBullet1": "Plages préservées (à pied)",
    "location.natureBullet2": "Spots de baignade cristallins",
    "location.natureBullet3": "Sentiers de randonnée avec vue mer",
    "location.natureBullet4": "Spots de snorkeling et plongée",
    "location.localAmenitiesTitle": "Commodités locales",
    "location.localBullet1": "Restaurants dalmates traditionnels",
    "location.localBullet2": "Marchés et boutiques locaux",
    "location.localBullet3": "Villes et villages historiques",
    "location.localBullet4": "Sports nautiques et location de bateaux",
    "location.mapTitle": "Carte",
    "location.mapCaption": "Cliquez sur la carte pour l'ouvrir dans Google Maps et obtenir l'itinéraire",
    "location.aboutVlTitle": "À propos de Vela Luka et Korčula",
    "location.aboutVlP1": "Vela Luka est une charmante ville à l'extrémité ouest de l'île de Korčula, connue pour sa belle baie, ses eaux cristallines et son atmosphère méditerranéenne authentique. L'île de Korčula est célèbre pour ses couchers de soleil saisissants, ses fruits de mer frais et son climat doux.",
    "location.aboutVlP2": "Les mois d'été (juin-septembre) sont parfaits pour la baignade et les activités nautiques, tandis que le printemps et l'automne offrent un climat plus doux idéal pour l'exploration. La ville propose de nombreux restaurants, cafés et marchés locaux où découvrir la culture dalmate authentique.",
    "location.aboutVlP3": "Ne manquez pas de visiter la célèbre vieille ville de Korčula, les domaines viticoles locaux et les îles voisines. La région est parfaite pour la voile, la plongée et profiter du mode de vie méditerranéen.",

    "reviews.eyebrow": "Anciens voyageurs",
    "reviews.title": "Avis",
    "reviews.description": "Ce que les voyageurs ont dit après leur séjour chez Housey, Vela Luka.",
    "reviews.emptyState": "Pas encore d'avis — revenez bientôt.",
    "reviews.readOnSource": "Lire sur {source} →",

    "contact.title": "Contactez-nous",
    "contact.subtitle": "Des questions ? Nous serions ravis d'échanger avec vous.",
    "contact.getInTouch": "Prendre contact",
    "contact.address": "Adresse",
    "contact.emailLabel": "E-mail",
    "contact.phoneLabel": "Téléphone",
    "contact.responseTime": "Délai de réponse",
    "contact.responseTimeValue": "Nous répondons généralement sous 24 heures",
    "contact.viewOnMap": "📍 Voir sur la carte →",
    "contact.officeHours": "Horaires",
    "contact.followUs": "Suivez-nous",
    "contact.weekdaysLabel": "Lundi - Vendredi",
    "contact.weekdaysHours": "9h00 - 18h00",
    "contact.saturdayLabel": "Samedi",
    "contact.saturdayHours": "10h00 - 16h00",
    "contact.sundayLabel": "Dimanche",
    "contact.closed": "Fermé",
    "contact.sendMessage": "Envoyez-nous un message",
    "contact.thankYou": "Merci pour votre message ! Nous reviendrons vers vous rapidement.",
    "contact.nameLabel": "Nom *",
    "contact.contactEmailLabel": "E-mail *",
    "contact.subjectLabel": "Sujet *",
    "contact.messageLabel": "Message *",
    "contact.placeholderName": "Votre nom",
    "contact.placeholderEmail": "votre@email.com",
    "contact.placeholderSubject": "De quoi s'agit-il ?",
    "contact.placeholderMessage": "Votre message...",
    "contact.sending": "Envoi en cours...",
    "contact.sendBtn": "Envoyer le message",
    "contact.errNameMin": "Le nom doit contenir au moins 2 caractères",
    "contact.errEmail": "Adresse e-mail invalide",
    "contact.errSubjectReq": "Le sujet est obligatoire",
    "contact.errMessageMin": "Le message doit contenir au moins 10 caractères",
    "contact.alertFailed": "Échec de l'envoi du message. Réessayez ou écrivez-nous directement par e-mail.",

    "booking.title": "Réserver votre séjour",
    "booking.subtitle": "Remplissez le formulaire ci-dessous et nous vous recontacterons rapidement pour confirmer votre réservation.",
    "booking.pricingTitle": "Tarifs et détails",
    "booking.peakSeason": "Haute saison (juin-sept)",
    "booking.midSeason": "Moyenne saison (avr-mai, oct)",
    "booking.lowSeason": "Basse saison (nov-mars)",
    "booking.pricingPeakValue": "270 €/nuit",
    "booking.pricingMidValue": "220 €/nuit",
    "booking.pricingLowValue": "180 €/nuit",
    "booking.minStay": "✓ Séjour minimum : 5 nuits",
    "booking.maxCapacity": "✓ Capacité maximale : 2 voyageurs",
    "booking.checkInHours": "✓ Arrivée : 16h00",
    "booking.checkOutHours": "✓ Départ : 10h00",
    "booking.includedTitle": "Ce qui est inclus",
    "booking.amenityKitchen": "Cuisine entièrement équipée",
    "booking.amenityWifiTv": "WiFi et TV",
    "booking.amenityAc": "Climatisation",
    "booking.amenityParking": "Parking privé",
    "booking.amenityTerrace": "Terrasse extérieure",
    "booking.amenityBbq": "Barbecue",
    "booking.amenityBeach": "Accès à la plage",
    "booking.amenityLinens": "Draps et serviettes",
    "booking.reservationRequestTitle": "Demande de réservation",
    "booking.thankYouToast": "Merci ! Nous avons reçu votre demande de réservation et vous contacterons bientôt.",
    "booking.selectDatesLabel": "Sélectionnez les dates *",
    "booking.minStayError": "Le séjour minimum est de 5 nuits.",
    "booking.unavailableRangeError": "La période sélectionnée comprend des dates indisponibles. Choisissez d'autres dates.",
    "booking.selectDatesError": "Sélectionnez les dates d'arrivée et de départ.",
    "booking.failedAlert": "Échec de l'envoi de la demande. Réessayez ou contactez-nous directement.",
    "booking.clickCheckIn": "👆 Cliquez sur une date pour l'arrivée",
    "booking.clickCheckOut": "👆 Sélectionnez maintenant le départ (min. 5 nuits)",
    "booking.legendSelected": "Sélectionné",
    "booking.legendRange": "Période",
    "booking.legendUnavailable": "Indisponible",
    "booking.calPrev": "← Précédent",
    "booking.calNext": "Suivant →",
    "booking.checkInRow": "Arrivée :",
    "booking.checkOutRow": "Départ :",
    "booking.durationRow": "Durée :",
    "booking.nightsSuffix": "nuits",
    "booking.nightSuffix": "nuit",
    "booking.nameLabel": "Nom complet *",
    "booking.emailLabel": "Adresse e-mail *",
    "booking.phoneLabel": "Numéro de téléphone *",
    "booking.guestsLabel": "Nombre de voyageurs *",
    "booking.guestSelectPlaceholder": "Sélectionner...",
    "booking.guest1": "1 voyageur",
    "booking.guest2": "2 voyageurs",
    "booking.messageLabel": "Message complémentaire (facultatif)",
    "booking.placeholderName": "Jean Dupont",
    "booking.placeholderEmail": "jean@example.com",
    "booking.placeholderPhone": "+33 1 23 45 67 89",
    "booking.placeholderMessage": "Demandes particulières ou questions ?",
    "booking.submitting": "Envoi en cours...",
    "booking.submitBtn": "Envoyer la demande de réservation",
    "booking.tooltipMinNights": "Min. 5 nuits",
    "booking.tooltipUnavailable": "Indisponible",
    "booking.errNameMin": "Le nom doit contenir au moins 2 caractères",
    "booking.errEmail": "Adresse e-mail invalide",
    "booking.errPhoneMin": "Le numéro de téléphone est obligatoire",
    "booking.errGuestsReq": "Le nombre de voyageurs est obligatoire",
    "booking.calMonthJan": "Janvier",
    "booking.calMonthFeb": "Février",
    "booking.calMonthMar": "Mars",
    "booking.calMonthApr": "Avril",
    "booking.calMonthMay": "Mai",
    "booking.calMonthJun": "Juin",
    "booking.calMonthJul": "Juillet",
    "booking.calMonthAug": "Août",
    "booking.calMonthSep": "Septembre",
    "booking.calMonthOct": "Octobre",
    "booking.calMonthNov": "Novembre",
    "booking.calMonthDec": "Décembre",
    "booking.calDayMon": "Lun",
    "booking.calDayTue": "Mar",
    "booking.calDayWed": "Mer",
    "booking.calDayThu": "Jeu",
    "booking.calDayFri": "Ven",
    "booking.calDaySat": "Sam",
    "booking.calDaySun": "Dim",

    "gallery.eyebrow": "Côte dalmate",
    "gallery.title": "Galerie",
    "gallery.description": "Explorez notre refuge sur la côte dalmate — des eaux azur et terrasses en pierre aux intérieurs chaleureux.",
    "gallery.catAll": "Toutes les photos",
    "gallery.catAerial": "Vues aériennes",
    "gallery.catCoast": "Mer et côte",
    "gallery.catExterior": "Extérieur",
    "gallery.catTerrace": "Terrasse",
    "gallery.catInterior": "Intérieur",
    "gallery.emptyCategory": "Aucune image dans cette catégorie.",
  },
};
