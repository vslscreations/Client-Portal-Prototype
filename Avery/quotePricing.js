(function () {
    const BASE_PICKUP_FEE = 35;
    const MILEAGE_RATE = 2.25;

    function normalizeUrgency(urgency) {
        const normalized = String(urgency || "").trim().toLowerCase();

        if (normalized === "stat") {
            return {
                label: "STAT",
                surchargePercent: 0.75
            };
        }

        if (normalized === "after-hours" || normalized === "after hours") {
            return {
                label: "After-hours",
                surchargePercent: 0.4
            };
        }

        if (normalized === "rush" || normalized === "high priority" || normalized === "asap") {
            return {
                label: "Rush",
                surchargePercent: 0.25
            };
        }

        if (normalized === "same-day" || normalized === "same day") {
            return {
                label: "Same-Day",
                surchargePercent: 0
            };
        }

        return {
            label: "Standard",
            surchargePercent: 0
        };
    }

    function calculateQuoteEstimate(serviceType, mileage, urgency) {
        const mileageValue = Number(mileage) || 0;
        const subtotal = BASE_PICKUP_FEE + (mileageValue * MILEAGE_RATE);
        const urgencyInfo = normalizeUrgency(urgency);
        const surchargeAmount = subtotal * urgencyInfo.surchargePercent;
        const estimatedTotal = subtotal + surchargeAmount;

        return {
            baseFee: BASE_PICKUP_FEE,
            mileage: mileageValue,
            mileageFee: mileageValue * MILEAGE_RATE,
            subtotal: subtotal,
            surchargePercent: urgencyInfo.surchargePercent,
            surchargeAmount: surchargeAmount,
            estimatedTotal: estimatedTotal,
            urgencyLabel: urgencyInfo.label,
            serviceType: serviceType || "Scheduled Route",
            breakdown: [
                { label: "Base pickup", value: BASE_PICKUP_FEE },
                { label: "Mileage", value: mileageValue * MILEAGE_RATE, details: `${mileageValue} miles × $${MILEAGE_RATE.toFixed(2)}` },
                { label: urgencyInfo.label === "Standard" ? "Urgency" : `${urgencyInfo.label} surcharge`, value: surchargeAmount, details: urgencyInfo.surchargePercent > 0 ? `${(urgencyInfo.surchargePercent * 100).toFixed(0)}%` : "No surcharge" }
            ]
        };
    }

    window.DasherLabQuotePricing = {
        BASE_PICKUP_FEE: BASE_PICKUP_FEE,
        MILEAGE_RATE: MILEAGE_RATE,
        normalizeUrgency: normalizeUrgency,
        calculateQuoteEstimate: calculateQuoteEstimate
    };

    window.calculateQuoteEstimate = calculateQuoteEstimate;
})();
