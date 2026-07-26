function nextQuoteStep(step){


document.querySelectorAll(".form-card").forEach(card=>{

card.classList.add("hidden");

});



document.getElementById("quoteStep" + step)
.classList.remove("hidden");



document.getElementById("quoteProgressText").innerText =
"Step " + step + " of 4";



let percent = step * 25;


document.getElementById("quoteProgressFill")
.style.width = percent + "%";


}





function generateQuote(){


let prices = [
750,
1200,
1500,
2200,
3500
];


let quote =
prices[Math.floor(Math.random()*prices.length)];



document.getElementById("generatedQuote").innerText =
"$" + quote.toLocaleString();



document.getElementById("quoteResultService").innerText =
document.getElementById("quoteService").value;



document.getElementById("quoteTimeline").innerText =
"5-7 Business Days";



document.getElementById("quoteResultPriority").innerText =
document.getElementById("quotePriority").value;



showQuoteAnalysis();


}

function generateFinalQuote(){

let prices=[
750,
1200,
1500,
2200,
3500
];


let quote =
prices[Math.floor(Math.random()*prices.length)];


document.getElementById("generatedQuote").innerText =
"$" + quote.toLocaleString();


document.getElementById("quoteTimeline").innerText =
"5-7 Business Days";


}

function showQuoteAnalysis(){

nextQuoteStep(4);


document.getElementById("generatedQuote").innerText =
"Analyzing...";


setTimeout(()=>{

generateFinalQuote();

},2000);


}



function submitQuote(){


let quoteRequest = {


type:
"Sales Opportunity",

company:
document.getElementById("quoteCompany").value,


contact:
document.getElementById("quoteContact").value,


email:
document.getElementById("quoteEmail").value,


phone:
document.getElementById("quotePhone").value,


service:
document.getElementById("quoteService").value,


budget:
document.getElementById("quoteBudget").value,


description:
document.getElementById("quoteDescription").value,


priority:
document.getElementById("quotePriority").value,


status:
"Pending",


createdBy:
"Avery AI"


};



let requests =
JSON.parse(localStorage.getItem("requests")) || [];



requests.push(quoteRequest);



localStorage.setItem(
"requests",
JSON.stringify(requests)
);



alert("Your quote request has been submitted!");



window.location.href="index.html";


}