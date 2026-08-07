(function () {
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

    function getStoredObject(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            if (!value) {
                return fallback;
            }
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === "object" ? parsed : fallback;
        } catch (err) {
            return fallback;
        }
    }

    function normalizeRequest(request) {
        if (!request || typeof request !== "object") {
            return null;
        }

        const customer = request.customer || {};
        const delivery = request.delivery || {};
        const pickup = request.pickup || {};
        const createdAt = request.createdAt || "";
        const status = (request.status || "").toLowerCase();
        const serviceLevel = (delivery.serviceLevel || "").toLowerCase();

        return {
            ...request,
            customer,
            delivery,
            pickup,
            createdAt,
            status,
            serviceLevel
        };
    }

    function getTodayOperations() {
        const requests = getStoredArray("requests")
            .map(normalizeRequest)
            .filter(Boolean);

        const today = new Date();
        const todayString = today.toISOString().slice(0, 10);

        const scheduledToday = requests.filter(function (request) {
            if (!request.delivery || !request.delivery.pickupDate) {
                return false;
            }
            return (request.delivery.pickupDate || "").slice(0, 10) === todayString;
        });

        const pending = requests.filter(function (request) {
            const status = request.status || "";
            return ["pending", "awaiting dispatch", "awaiting review", "pending review"].includes(status);
        });

        const active = requests.filter(function (request) {
            const status = request.status || "";
            return ["accepted", "in progress", "assigned", "dispatched"].includes(status);
        });

        const completed = requests.filter(function (request) {
            return (request.status || "").toLowerCase() === "completed";
        });

        return {
            pickupsScheduledToday: scheduledToday.length,
            pendingRequests: pending.length,
            activeDeliveries: active.length,
            completedDeliveries: completed.length,
            requests: requests
        };
    }

    function getBusinessOverview() {
        const requests = getStoredArray("requests")
            .map(normalizeRequest)
            .filter(Boolean);

        const customerCounts = {};
        const routeCounts = {};
        let estimatedRevenue = 0;

        requests.forEach(function (request) {
            const customerName = request.customer && request.customer.companyName
                ? request.customer.companyName
                : request.customer && request.customer.customerName
                    ? request.customer.customerName
                    : "Unknown";

            customerCounts[customerName] = (customerCounts[customerName] || 0) + 1;

            const routeKey = [request.delivery && request.delivery.pickupAddress, request.delivery && request.delivery.deliveryAddress]
                .filter(Boolean)
                .join(" → ");

            if (routeKey) {
                routeCounts[routeKey] = (routeCounts[routeKey] || 0) + 1;
            }

            if (request.quote && typeof request.quote.estimatedTotal === "number") {
                estimatedRevenue += request.quote.estimatedTotal;
            }
        });

        const topCustomer = Object.keys(customerCounts).sort(function (a, b) {
            return customerCounts[b] - customerCounts[a];
        })[0] || "";

        const mostUsedRoute = Object.keys(routeCounts).sort(function (a, b) {
            return routeCounts[b] - routeCounts[a];
        })[0] || "";

        return {
            totalPickups: requests.length,
            totalCustomers: Object.keys(customerCounts).length,
            topCustomer: topCustomer,
            mostUsedRoute: mostUsedRoute,
            estimatedRevenue: estimatedRevenue,
            customerCounts: customerCounts,
            routeCounts: routeCounts
        };
    }

    function getAveryInsights() {
        const requests = getStoredArray("requests")
            .map(normalizeRequest)
            .filter(Boolean);
        const overview = getBusinessOverview();
        const operations = getTodayOperations();
        const insights = [];

        if (overview.topCustomer) {
            insights.push(`${overview.topCustomer} is your most active customer.`);
        }

        if (overview.mostUsedRoute) {
            insights.push(`Your most common route is ${overview.mostUsedRoute}.`);
        }

        if (operations.pickupsScheduledToday > 0) {
            insights.push(`You have ${operations.pickupsScheduledToday} pickups scheduled for today.`);
        }

        if (operations.pendingRequests > 0) {
            insights.push(`${operations.pendingRequests} requests are still awaiting review.`);
        }

        if (overview.estimatedRevenue > 0) {
            insights.push(`Estimated revenue from quote data is $${overview.estimatedRevenue.toLocaleString()}.`);
        }

        const rushRequests = requests.filter(function (request) {
            return (request.serviceLevel || "").toLowerCase() === "rush";
        });

        if (rushRequests.length > 0) {
            insights.push(`Rush requests account for ${rushRequests.length} of your current requests.`);
        }

        return insights;
    }

    const analyticsApi = {
        getTodayOperations: getTodayOperations,
        getBusinessOverview: getBusinessOverview,
        getAveryInsights: getAveryInsights
    };

    window.DasherLabDashboardAnalytics = analyticsApi;
    window.AveryAnalytics = analyticsApi;

    window.getTodayOperations = getTodayOperations;
    window.getBusinessOverview = getBusinessOverview;
    window.getAveryInsights = getAveryInsights;
})();
