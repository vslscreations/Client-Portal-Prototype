const DasherLabKnowledge = {

    company: {
        name: "Dasher Lab Medical Courier",
        parentCompany: "Eleven10 Group LLC",
        description: "Reliable HIPAA-aware medical courier services throughout Nevada."
    },

    hours: {
        mondayFriday: "6:00 AM - 8:00 PM",
        saturday: "7:00 AM - 4:00 PM",
        sunday: "Emergency and scheduled deliveries only"
    },

    contact: {
        phone: "725-444-4358"
    },

    serviceAreas: [
        "Las Vegas",
        "Henderson",
        "North Las Vegas",
        "Boulder City",
        "Pahrump",
        "Mesquite",
        "Reno",
        "Sparks",
        "Carson City",
        "Statewide custom routes"
    ],

    services: [
        "STAT medical delivery",
        "Same-day delivery",
        "Laboratory specimen transportation",
        "Blood transport",
        "Urine transport",
        "Pharmacy prescription delivery",
        "Medical equipment transport",
        "Interoffice mail",
        "Scheduled recurring routes"
    ],

    deliveryOptions: {
        stat: "Immediate direct pickup",
        rush: "Typically within 60 minutes",
        sameDay: "Before close of business",
        recurring: "Scheduled contract routes"
    },

    pricing: {
        localStarting: "$35",
        rushStarting: "$50",
        statStarting: "$65",
        mileage: "$1.75–$2.50 per mile",
        recurring: "Custom contract pricing"
    },

    pickupRequirements: [
        "Shipment packaged and ready",
        "Specimens properly labeled",
        "Required paperwork completed"
    ],

    policies: {
        cancellation: "...",
        documentation: "...",
        compliance: "HIPAA-aware handling and secure chain of custody"
    }

};
window.DasherLabKnowledge = DasherLabKnowledge;

// Temporary compatibility bridge for existing Avery code
window.businessKnowledge = {

    description: DasherLabKnowledge.company.description,

    serviceAreas: DasherLabKnowledge.serviceAreas,

    coverageArea: `
        We currently serve: ${DasherLabKnowledge.serviceAreas.join(", ")}.
        <br><br>
        We also support statewide custom routes for larger or recurring needs.
    `,

    pricing: `
        Local delivery starts at ${DasherLabKnowledge.pricing.localStarting}.
        Rush delivery starts at ${DasherLabKnowledge.pricing.rushStarting}.
        STAT delivery starts at ${DasherLabKnowledge.pricing.statStarting}.
        Mileage outside standard areas is ${DasherLabKnowledge.pricing.mileage}.
        Recurring routes have ${DasherLabKnowledge.pricing.recurring}.
    `,

    hours: `
        Monday-Friday: ${DasherLabKnowledge.hours.mondayFriday}
        <br>
        Saturday: ${DasherLabKnowledge.hours.saturday}
        <br>
        Sunday: ${DasherLabKnowledge.hours.sunday}
    `

};