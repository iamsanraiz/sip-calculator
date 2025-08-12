// Global variables
let currentMode = 'investment';
let pieChart = null;
let lineChart = null;

// Default values from application data
const defaultValues = {
    monthlyAmount: 5000,
    investmentPeriod: 10,
    expectedReturn: 12,
    stepUpRate: 10,
    inflationRate: 6,
    targetAmount: 1000000
};

// Chart colors
const chartColors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F'];

// DOM elements
const elements = {
    // Mode buttons
    investmentModeBtn: document.getElementById('investmentMode'),
    targetModeBtn: document.getElementById('targetMode'),
    
    // Input sections
    investmentInputs: document.getElementById('investmentInputs'),
    targetInputs: document.getElementById('targetInputs'),
    
    // Sliders and values
    sipAmount: document.getElementById('sipAmount'),
    sipAmountValue: document.getElementById('sipAmountValue'),
    targetAmount: document.getElementById('targetAmount'),
    targetAmountValue: document.getElementById('targetAmountValue'),
    period: document.getElementById('period'),
    periodValue: document.getElementById('periodValue'),
    expectedReturn: document.getElementById('expectedReturn'),
    returnValue: document.getElementById('returnValue'),
    
    // Advanced options
    stepUpToggle: document.getElementById('stepUpToggle'),
    stepUpOptions: document.getElementById('stepUpOptions'),
    stepUpRate: document.getElementById('stepUpRate'),
    stepUpValue: document.getElementById('stepUpValue'),
    inflationToggle: document.getElementById('inflationToggle'),
    inflationOptions: document.getElementById('inflationOptions'),
    inflationRate: document.getElementById('inflationRate'),
    inflationValue: document.getElementById('inflationValue'),
    
    // Result displays
    totalInvestment: document.getElementById('totalInvestment'),
    estimatedReturns: document.getElementById('estimatedReturns'),
    maturityAmount: document.getElementById('maturityAmount'),
    inflationAdjustedCard: document.getElementById('inflationAdjustedCard'),
    inflationAdjustedValue: document.getElementById('inflationAdjustedValue'),
    
    // Buttons
    resetBtn: document.getElementById('resetBtn'),
    exportBtn: document.getElementById('exportBtn'),
    
    // Charts
    pieChart: document.getElementById('pieChart'),
    lineChart: document.getElementById('lineChart')
};

// Utility functions
function formatCurrency(amount) {
    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
        return `₹${(amount / 1000).toFixed(0)}K`;
    } else {
        return `₹${Math.round(amount).toLocaleString('en-IN')}`;
    }
}

function formatNumber(num) {
    return num.toLocaleString('en-IN');
}

// SIP calculation functions
function calculateRegularSIP(monthlyAmount, annualReturn, years) {
    const monthlyRate = annualReturn / 12 / 100;
    const totalMonths = years * 12;
    
    if (monthlyRate === 0) {
        return monthlyAmount * totalMonths;
    }
    
    const maturityAmount = monthlyAmount * (((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate));
    return maturityAmount;
}

function calculateStepUpSIP(initialAmount, annualReturn, years, stepUpRate) {
    let totalMaturityAmount = 0;
    let currentAmount = initialAmount;
    
    for (let year = 1; year <= years; year++) {
        const yearlyMaturity = calculateRegularSIP(currentAmount, annualReturn, 1);
        // Calculate future value of this year's investment at the end of investment period
        const remainingYears = years - year;
        const futureValue = yearlyMaturity * Math.pow(1 + annualReturn / 100, remainingYears);
        totalMaturityAmount += futureValue;
        
        // Increase amount for next year
        currentAmount = currentAmount * (1 + stepUpRate / 100);
    }
    
    return totalMaturityAmount;
}

function calculateRequiredSIP(targetAmount, annualReturn, years) {
    const monthlyRate = annualReturn / 12 / 100;
    const totalMonths = years * 12;
    
    if (monthlyRate === 0) {
        return targetAmount / totalMonths;
    }
    
    const requiredSIP = targetAmount / (((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate));
    return requiredSIP;
}

function calculateInflationAdjustedValue(amount, inflationRate, years) {
    return amount / Math.pow(1 + inflationRate / 100, years);
}

// Main calculation function
function performCalculations() {
    const isStepUp = elements.stepUpToggle.checked;
    const isInflationAdjusted = elements.inflationToggle.checked;
    
    const monthlyAmount = parseInt(elements.sipAmount.value);
    const targetAmount = parseInt(elements.targetAmount.value);
    const years = parseInt(elements.period.value);
    const annualReturn = parseFloat(elements.expectedReturn.value);
    const stepUpRate = parseFloat(elements.stepUpRate.value);
    const inflationRate = parseFloat(elements.inflationRate.value);
    
    let results = {};
    
    if (currentMode === 'investment') {
        // Calculate maturity amount based on SIP amount
        let maturityAmount;
        let totalInvestment;
        
        if (isStepUp) {
            maturityAmount = calculateStepUpSIP(monthlyAmount, annualReturn, years, stepUpRate);
            // Calculate total investment for step-up SIP
            totalInvestment = 0;
            let currentAmount = monthlyAmount;
            for (let year = 1; year <= years; year++) {
                totalInvestment += currentAmount * 12;
                currentAmount = currentAmount * (1 + stepUpRate / 100);
            }
        } else {
            maturityAmount = calculateRegularSIP(monthlyAmount, annualReturn, years);
            totalInvestment = monthlyAmount * years * 12;
        }
        
        const estimatedReturns = maturityAmount - totalInvestment;
        const inflationAdjustedAmount = isInflationAdjusted ? 
            calculateInflationAdjustedValue(maturityAmount, inflationRate, years) : maturityAmount;
        
        results = {
            totalInvestment,
            estimatedReturns,
            maturityAmount,
            inflationAdjustedAmount,
            requiredSIP: null
        };
        
    } else {
        // Calculate required SIP for target amount
        const requiredSIP = calculateRequiredSIP(targetAmount, annualReturn, years);
        const totalInvestment = requiredSIP * years * 12;
        const estimatedReturns = targetAmount - totalInvestment;
        const inflationAdjustedAmount = isInflationAdjusted ? 
            calculateInflationAdjustedValue(targetAmount, inflationRate, years) : targetAmount;
        
        results = {
            totalInvestment,
            estimatedReturns,
            maturityAmount: targetAmount,
            inflationAdjustedAmount,
            requiredSIP
        };
        
        // Update SIP amount display for target mode
        elements.sipAmountValue.textContent = formatNumber(Math.round(requiredSIP));
    }
    
    updateResultsDisplay(results);
    updateCharts(results);
}

// Update results display
function updateResultsDisplay(results) {
    elements.totalInvestment.textContent = formatCurrency(results.totalInvestment);
    elements.estimatedReturns.textContent = formatCurrency(results.estimatedReturns);
    elements.maturityAmount.textContent = formatCurrency(results.maturityAmount);
    
    // Show/hide inflation adjusted value
    if (elements.inflationToggle.checked) {
        elements.inflationAdjustedCard.classList.remove('hidden');
        elements.inflationAdjustedValue.textContent = formatCurrency(results.inflationAdjustedAmount);
    } else {
        elements.inflationAdjustedCard.classList.add('hidden');
    }
}

// Update charts
function updateCharts(results) {
    updatePieChart(results);
    updateLineChart(results);
}

function updatePieChart(results) {
    const ctx = elements.pieChart.getContext('2d');
    
    if (pieChart) {
        pieChart.destroy();
    }
    
    pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Total Investment', 'Estimated Returns'],
            datasets: [{
                data: [results.totalInvestment, results.estimatedReturns],
                backgroundColor: [chartColors[0], chartColors[1]],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = formatCurrency(context.raw);
                            return `${context.label}: ${value}`;
                        }
                    }
                }
            }
        }
    });
}

function updateLineChart(results) {
    const ctx = elements.lineChart.getContext('2d');
    const years = parseInt(elements.period.value);
    const monthlyAmount = parseInt(elements.sipAmount.value);
    const annualReturn = parseFloat(elements.expectedReturn.value);
    const isStepUp = elements.stepUpToggle.checked;
    
    // Generate data points for wealth growth
    const labels = [];
    const investmentData = [];
    const wealthData = [];
    
    for (let year = 0; year <= years; year++) {
        labels.push(`Year ${year}`);
        
        if (year === 0) {
            investmentData.push(0);
            wealthData.push(0);
        } else {
            let totalInvestment, maturityAmount;
            
            if (isStepUp) {
                // Calculate step-up values for current year
                totalInvestment = 0;
                let currentAmount = monthlyAmount;
                for (let y = 1; y <= year; y++) {
                    totalInvestment += currentAmount * 12;
                    currentAmount = currentAmount * (1 + parseFloat(elements.stepUpRate.value) / 100);
                }
                maturityAmount = calculateStepUpSIP(monthlyAmount, annualReturn, year, parseFloat(elements.stepUpRate.value));
            } else {
                totalInvestment = monthlyAmount * year * 12;
                maturityAmount = calculateRegularSIP(monthlyAmount, annualReturn, year);
            }
            
            investmentData.push(totalInvestment);
            wealthData.push(maturityAmount);
        }
    }
    
    if (lineChart) {
        lineChart.destroy();
    }
    
    lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Investment',
                    data: investmentData,
                    borderColor: chartColors[2],
                    backgroundColor: chartColors[2] + '20',
                    fill: false,
                    tension: 0.4
                },
                {
                    label: 'Wealth Growth',
                    data: wealthData,
                    borderColor: chartColors[0],
                    backgroundColor: chartColors[0] + '20',
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = formatCurrency(context.raw);
                            return `${context.dataset.label}: ${value}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Event listeners
function setupEventListeners() {
    // Mode switching
    elements.investmentModeBtn.addEventListener('click', () => switchMode('investment'));
    elements.targetModeBtn.addEventListener('click', () => switchMode('target'));
    
    // Slider inputs
    elements.sipAmount.addEventListener('input', (e) => {
        elements.sipAmountValue.textContent = formatNumber(e.target.value);
        performCalculations();
    });
    
    elements.targetAmount.addEventListener('input', (e) => {
        elements.targetAmountValue.textContent = formatCurrency(parseInt(e.target.value));
        performCalculations();
    });
    
    elements.period.addEventListener('input', (e) => {
        elements.periodValue.textContent = e.target.value;
        performCalculations();
    });
    
    elements.expectedReturn.addEventListener('input', (e) => {
        elements.returnValue.textContent = e.target.value;
        performCalculations();
    });
    
    elements.stepUpRate.addEventListener('input', (e) => {
        elements.stepUpValue.textContent = e.target.value;
        performCalculations();
    });
    
    elements.inflationRate.addEventListener('input', (e) => {
        elements.inflationValue.textContent = e.target.value;
        performCalculations();
    });
    
    // Toggle switches
    elements.stepUpToggle.addEventListener('change', () => {
        if (elements.stepUpToggle.checked) {
            elements.stepUpOptions.classList.remove('hidden');
        } else {
            elements.stepUpOptions.classList.add('hidden');
        }
        performCalculations();
    });
    
    elements.inflationToggle.addEventListener('change', () => {
        if (elements.inflationToggle.checked) {
            elements.inflationOptions.classList.remove('hidden');
        } else {
            elements.inflationOptions.classList.add('hidden');
        }
        performCalculations();
    });
    
    // Action buttons
    elements.resetBtn.addEventListener('click', resetCalculator);
    elements.exportBtn.addEventListener('click', exportResults);
    
    // Scenario cards
    const scenarioCards = document.querySelectorAll('.scenario-card');
    scenarioCards.forEach(card => {
        card.addEventListener('click', () => {
            const scenario = card.getAttribute('data-scenario');
            loadScenario(scenario);
        });
    });
}

// Mode switching
function switchMode(mode) {
    currentMode = mode;
    
    if (mode === 'investment') {
        elements.investmentModeBtn.classList.add('mode-btn--active');
        elements.targetModeBtn.classList.remove('mode-btn--active');
        elements.investmentInputs.classList.remove('hidden');
        elements.targetInputs.classList.add('hidden');
    } else {
        elements.targetModeBtn.classList.add('mode-btn--active');
        elements.investmentModeBtn.classList.remove('mode-btn--active');
        elements.investmentInputs.classList.add('hidden');
        elements.targetInputs.classList.remove('hidden');
    }
    
    performCalculations();
}

// Load scenario
function loadScenario(scenarioType) {
    const scenarios = {
        conservative: { amount: 3000, period: 15, return: 10 },
        moderate: { amount: 5000, period: 10, return: 12 },
        aggressive: { amount: 10000, period: 8, return: 15 }
    };
    
    const scenario = scenarios[scenarioType];
    if (scenario) {
        elements.sipAmount.value = scenario.amount;
        elements.sipAmountValue.textContent = formatNumber(scenario.amount);
        elements.period.value = scenario.period;
        elements.periodValue.textContent = scenario.period;
        elements.expectedReturn.value = scenario.return;
        elements.returnValue.textContent = scenario.return;
        
        // Reset toggles
        elements.stepUpToggle.checked = false;
        elements.stepUpOptions.classList.add('hidden');
        elements.inflationToggle.checked = false;
        elements.inflationOptions.classList.add('hidden');
        
        // Switch to investment mode if not already
        if (currentMode !== 'investment') {
            switchMode('investment');
        } else {
            performCalculations();
        }
    }
}

// Reset calculator
function resetCalculator() {
    // Reset to default values
    elements.sipAmount.value = defaultValues.monthlyAmount;
    elements.sipAmountValue.textContent = formatNumber(defaultValues.monthlyAmount);
    elements.targetAmount.value = defaultValues.targetAmount;
    elements.targetAmountValue.textContent = formatCurrency(defaultValues.targetAmount);
    elements.period.value = defaultValues.investmentPeriod;
    elements.periodValue.textContent = defaultValues.investmentPeriod;
    elements.expectedReturn.value = defaultValues.expectedReturn;
    elements.returnValue.textContent = defaultValues.expectedReturn;
    elements.stepUpRate.value = defaultValues.stepUpRate;
    elements.stepUpValue.textContent = defaultValues.stepUpRate;
    elements.inflationRate.value = defaultValues.inflationRate;
    elements.inflationValue.textContent = defaultValues.inflationRate;
    
    // Reset toggles
    elements.stepUpToggle.checked = false;
    elements.stepUpOptions.classList.add('hidden');
    elements.inflationToggle.checked = false;
    elements.inflationOptions.classList.add('hidden');
    
    // Reset to investment mode
    switchMode('investment');
}

// Export results
function exportResults() {
    // Simulate export functionality
    alert('Export functionality would generate a PDF report with your SIP calculations and charts. This is a demo version.');
}

// Initialize the application
function init() {
    setupEventListeners();
    performCalculations();
    
    // Add fade-in animation to main content
    document.querySelector('.calculator-wrapper').classList.add('fade-in');
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
