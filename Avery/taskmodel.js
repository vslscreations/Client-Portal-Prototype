const AveryTaskModel = {

    createPickupTask() {

        return {

            type: "pickup",

            status: "collecting",

            progress: 0,

            completed: false,

            fields: {

                customerName: "",

                companyName: "",

                contactName: "",

                phoneNumber: "",

                email: "",

                pickupAddress: "",

                deliveryAddress: "",

                serviceLevel: "",

                shipmentType: "",

                specialInstructions: ""

            }

        };

    },


    createQuoteTask() {

        return {

            type: "quote",

            status: "collecting",

            progress: 0,

            completed: false,

            fields: {

                companyName: "",

                contactName: "",

                phoneNumber: "",

                email: "",

                serviceRequested: "",

                pickupCity: "",

                deliveryCity: "",

                estimatedFrequency: ""

            }

        };

    }

};

window.AveryTaskModel = AveryTaskModel;