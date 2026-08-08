(function () {
    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getStoredArray(key) {
        try {
            const value = localStorage.getItem(key);
            if (!value) {
                return [];
            }
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    function normalizeRequest(request) {
        if (!request || typeof request !== "object") {
            return null;
        }

        const customer = request.customer || {};
        const delivery = request.delivery || {};
        const pickup = request.pickup || {};

        return {
            ...request,
            customer,
            delivery,
            pickup,
            status: (request.status || "").toLowerCase()
        };
    }

    function getPickupDate(request) {
        return request && (request.delivery && request.delivery.pickupDate || request.pickupDate || request.date || "");
    }

    function getPickupTime(request) {
        return request && (request.delivery && request.delivery.pickupTime || request.pickupTime || request.time || "");
    }

    function getDisplayName(request) {
        const customer = request && request.customer ? request.customer : {};
        return customer.companyName || customer.customerName || request && (request.businessName || request.company) || "Customer";
    }

    function parseTimeToMinutes(value) {
        if (!value) {
            return null;
        }

        const text = String(value).trim();
        const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
        if (!match) {
            return null;
        }

        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2] || "0", 10);
        const meridiem = (match[3] || "").toUpperCase();

        if (meridiem === "AM" && hours === 12) {
            hours = 0;
        } else if (meridiem === "PM" && hours !== 12) {
            hours += 12;
        }

        return hours * 60 + minutes;
    }

    function detectSchedulingConflicts(requests) {
        const sourceRequests = Array.isArray(requests) ? requests : [];
        const normalizedRequests = sourceRequests.map(normalizeRequest).filter(Boolean);
        const pendingRequests = normalizedRequests.filter(function (request) {
            const status = (request.status || "").toLowerCase();
            return !["completed", "active", "accepted", "in progress", "assigned", "dispatched"].includes(status);
        });

        const conflictPairs = [];

        for (let index = 0; index < pendingRequests.length; index += 1) {
            for (let nextIndex = index + 1; nextIndex < pendingRequests.length; nextIndex += 1) {
                const firstRequest = pendingRequests[index];
                const secondRequest = pendingRequests[nextIndex];
                const firstDate = getPickupDate(firstRequest);
                const secondDate = getPickupDate(secondRequest);

                if (!firstDate || !secondDate || firstDate !== secondDate) {
                    continue;
                }

                const firstMinutes = parseTimeToMinutes(getPickupTime(firstRequest));
                const secondMinutes = parseTimeToMinutes(getPickupTime(secondRequest));

                if (firstMinutes === null || secondMinutes === null) {
                    continue;
                }

                const overlapWindow = Math.abs(firstMinutes - secondMinutes);
                if (overlapWindow <= 30) {
                    conflictPairs.push({
                        firstRequest: firstRequest,
                        secondRequest: secondRequest,
                        difference: overlapWindow
                    });
                }
            }
        }

        if (!conflictPairs.length) {
            return {
                type: "scheduling_conflict",
                severity: "low",
                message: "Everything looks good. I don't see any scheduling conflicts right now.",
                affectedRequests: []
            };
        }

        const conflict = conflictPairs[0];
        const firstName = getDisplayName(conflict.firstRequest);
        const secondName = getDisplayName(conflict.secondRequest);
        const firstTime = getPickupTime(conflict.firstRequest) || "scheduled time";
        const secondTime = getPickupTime(conflict.secondRequest) || "scheduled time";

        return {
            type: "scheduling_conflict",
            severity: "medium",
            message: `I noticed two pickups are scheduled close together today:<br>• ${escapeHtml(firstName)} at ${escapeHtml(firstTime)}<br>• ${escapeHtml(secondName)} at ${escapeHtml(secondTime)}<br><br>You may want to review the schedule before confirming both requests.`,
            affectedRequests: [
                {
                    customerName: firstName,
                    pickupTime: firstTime,
                    pickupDate: getPickupDate(conflict.firstRequest)
                },
                {
                    customerName: secondName,
                    pickupTime: secondTime,
                    pickupDate: getPickupDate(conflict.secondRequest)
                }
            ]
        };
    }

    function getScheduleInsights() {
        const analytics = window.AveryAnalytics;
        let requests = getStoredArray("requests");

        if (analytics && typeof analytics.getTodayOperations === "function") {
            const today = analytics.getTodayOperations();
            if (today && Array.isArray(today.requests)) {
                requests = today.requests;
            }
        }

        return detectSchedulingConflicts(requests);
    }

    window.DasherLabScheduleInsights = {
        detectSchedulingConflicts: detectSchedulingConflicts,
        getScheduleInsights: getScheduleInsights
    };
    window.detectSchedulingConflicts = detectSchedulingConflicts;
    window.getScheduleInsights = getScheduleInsights;
})();
