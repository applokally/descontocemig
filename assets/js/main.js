"use strict";


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const WHATSAPP_NUMBER = "5535991284648";

/*
 * A simulação utiliza como referência o exemplo informado:
 * em uma conta de R$ 500,00, aproximadamente R$ 385,00 seriam
 * relacionados à parcela elegível, equivalente a 77% da fatura.
 *
 * O cálculo definitivo dependerá da leitura real da conta.
 */
const ELIGIBLE_ENERGY_RATE = 0.77;
const DISCOUNT_RATE = 0.15;
const MINIMUM_BILL_VALUE = 160;


/* =========================================================
   ELEMENTOS
========================================================= */

const heroVideo = document.querySelector(".hero-video");

const profileStep = document.getElementById("profile-step");
const calculatorStep = document.getElementById("calculator-step");
const formStep = document.getElementById("form-step");

const profileButtons = document.querySelectorAll(".profile-button");

const calculatorBackButton = document.getElementById(
    "calculator-back-button"
);

const formBackButton = document.getElementById("form-back-button");

const calculatorContinueButton = document.getElementById(
    "calculator-continue-button"
);

const calculatorProfileText = document.getElementById(
    "calculator-profile-text"
);

const selectedProfileText = document.getElementById(
    "selected-profile-text"
);

const profileInput = document.getElementById("profile-input");

const billValueInput = document.getElementById("bill-value");
const billValueError = document.getElementById("bill-value-error");
const billTotalDisplayElement = document.getElementById(
    "bill-total-display"
);

const monthlySavingsElement = document.getElementById(
    "monthly-savings"
);

const annualSavingsElement = document.getElementById(
    "annual-savings"
);

const eligibleValueElement = document.getElementById(
    "eligible-value"
);

const estimatedFinalValueElement = document.getElementById(
    "estimated-final-value"
);

const formMonthlySavingsElement = document.getElementById(
    "form-monthly-savings"
);

const hiddenBillValueInput = document.getElementById(
    "bill-value-input"
);

const hiddenMonthlySavingsInput = document.getElementById(
    "monthly-savings-input"
);

const hiddenAnnualSavingsInput = document.getElementById(
    "annual-savings-input"
);

const leadForm = document.getElementById("lead-form");

const nameInput = document.getElementById("full-name");
const emailInput = document.getElementById("email");
const documentInput = document.getElementById("document");
const documentLabel = document.getElementById("document-label");

const privacyConsent = document.getElementById("privacy-consent");

const whatsappContactButtons = document.querySelectorAll(
    ".js-whatsapp-contact"
);

const registrationScrollButtons = document.querySelectorAll(
    ".js-scroll-to-registration"
);

const registrationCard = document.getElementById("cadastro");

const mobileMenuButton = document.querySelector(
    ".mobile-menu-button"
);

const mobileNavigation = document.getElementById(
    "mobile-navigation"
);

const lawModal = document.getElementById("law-modal");
const lawModalTrigger = document.getElementById("law-modal-trigger");
const lawModalClose = document.getElementById("law-modal-close");

const lawModalCloseButtons = document.querySelectorAll(
    "[data-law-modal-close]"
);

const faqQuestions = document.querySelectorAll(".faq-question");

let lastFocusedElement = null;
let selectedProfile = "";
let simulationData = createEmptySimulation();


/* =========================================================
   VÍDEO
========================================================= */

if (heroVideo) {
    heroVideo.addEventListener("loadedmetadata", () => {
        heroVideo.playbackRate = 0.55;
    });

    const playPromise = heroVideo.play();

    if (playPromise !== undefined) {
        playPromise.catch(() => {
            /* Autoplay bloqueado pelo navegador. */
        });
    }
}


/* =========================================================
   FALLBACK DA LOGO
========================================================= */

const brandLogo = document.querySelector(".brand-logo");
const brandFallback = document.querySelector(".brand-fallback");

if (brandLogo && brandFallback) {
    brandLogo.addEventListener("error", () => {
        brandLogo.style.display = "none";
        brandFallback.style.display = "inline-flex";
    });
}


/* =========================================================
   PERFIL
========================================================= */

profileButtons.forEach((button) => {
    button.addEventListener("click", () => {
        selectProfile(button.dataset.profile);
    });
});


function selectProfile(profile) {
    selectedProfile = profile;

    profileInput.value = profile;
    calculatorProfileText.textContent = profile;
    selectedProfileText.textContent = profile;

    configureDocumentField(profile);

    profileStep.hidden = true;
    calculatorStep.hidden = false;
    formStep.hidden = true;

    window.setTimeout(() => {
        billValueInput.focus();
    }, 100);
}


function configureDocumentField(profile) {
    const isResidential = profile === "Residencial";

    documentLabel.textContent = isResidential ? "CPF" : "CNPJ";

    documentInput.value = "";
    documentInput.maxLength = isResidential ? 14 : 18;
    documentInput.placeholder = isResidential
        ? "000.000.000-00"
        : "00.000.000/0000-00";

    clearFieldError(documentInput);
}


/* =========================================================
   NAVEGAÇÃO ENTRE ETAPAS
========================================================= */

calculatorBackButton.addEventListener("click", () => {
    returnToProfileSelection();
});


formBackButton.addEventListener("click", () => {
    formStep.hidden = true;
    calculatorStep.hidden = false;

    window.setTimeout(() => {
        billValueInput.focus();
    }, 100);
});


calculatorContinueButton.addEventListener("click", () => {
    const billValue = getBillValue();

    if (!validateBillValue(billValue)) {
        billValueInput.focus();

        return;
    }

    simulationData = calculateSavings(billValue);

    updateSimulationDisplay(simulationData);
    updateHiddenSimulationFields(simulationData);

    calculatorStep.hidden = true;
    formStep.hidden = false;

    window.setTimeout(() => {
        nameInput.focus();
    }, 100);
});


function returnToProfileSelection() {
    selectedProfile = "";

    profileInput.value = "";

    calculatorStep.hidden = true;
    formStep.hidden = true;
    profileStep.hidden = false;

    resetSimulation();
    leadForm.reset();
    clearAllErrors();

    window.setTimeout(() => {
        profileButtons[0]?.focus();
    }, 100);
}


function resetRegistrationFlow() {
    selectedProfile = "";

    profileInput.value = "";

    profileStep.hidden = false;
    calculatorStep.hidden = true;
    formStep.hidden = true;

    leadForm.reset();
    resetSimulation();
    clearAllErrors();
}


/* =========================================================
   DIRECIONAMENTO PARA O CADASTRO
========================================================= */

registrationScrollButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
        event.preventDefault();

        if (!registrationCard) {
            return;
        }

        resetRegistrationFlow();
        setMobileMenuState(false);

        registrationCard.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        window.setTimeout(() => {
            profileButtons[0]?.focus();
        }, 750);
    });
});


/* =========================================================
   SIMULADOR
========================================================= */

billValueInput.addEventListener("input", () => {
    formatBillInput();

    const billValue = getBillValue();

    if (billValue >= MINIMUM_BILL_VALUE) {
        billValueError.textContent = "";

        simulationData = calculateSavings(billValue);
        updateSimulationDisplay(simulationData);

        return;
    }

    simulationData = createEmptySimulation();
    updateSimulationDisplay(simulationData);

    if (billValue > 0) {
        billValueError.textContent =
            `O valor mínimo para simulação é ${formatCurrency(
                MINIMUM_BILL_VALUE
            )}.`;
    } else {
        billValueError.textContent = "";
    }
});


function formatBillInput() {
    const numbers = billValueInput.value.replace(/\D/g, "");

    if (!numbers) {
        billValueInput.value = "";

        return;
    }

    const decimalValue = Number(numbers) / 100;

    billValueInput.value = decimalValue.toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


function getBillValue() {
    const normalizedValue = billValueInput.value
        .replace(/\./g, "")
        .replace(",", ".");

    const parsedValue = Number(normalizedValue);

    return Number.isFinite(parsedValue)
        ? parsedValue
        : 0;
}


function validateBillValue(value) {
    if (value < MINIMUM_BILL_VALUE) {
        billValueError.textContent =
            `Informe uma conta com valor mínimo de ${formatCurrency(
                MINIMUM_BILL_VALUE
            )}.`;

        return false;
    }

    billValueError.textContent = "";

    return true;
}


function calculateSavings(billValue) {
    const eligibleValue =
        billValue * ELIGIBLE_ENERGY_RATE;

    const monthlySavings =
        eligibleValue * DISCOUNT_RATE;

    const annualSavings =
        monthlySavings * 12;

    const estimatedFinalValue =
        billValue - monthlySavings;

    return {
        billValue,
        eligibleValue,
        monthlySavings,
        annualSavings,
        estimatedFinalValue
    };
}


function updateSimulationDisplay(data) {
    if (billTotalDisplayElement) {
        billTotalDisplayElement.textContent = formatCurrency(
            data.billValue
        );
    }

    if (estimatedFinalValueElement) {
        estimatedFinalValueElement.textContent = formatCurrency(
            data.estimatedFinalValue
        );
    }

    if (monthlySavingsElement) {
        monthlySavingsElement.textContent = formatCurrency(
            data.monthlySavings
        );
    }

    if (annualSavingsElement) {
        annualSavingsElement.textContent = formatCurrency(
            data.annualSavings
        );
    }

    if (eligibleValueElement) {
        eligibleValueElement.textContent = formatCurrency(
            data.eligibleValue
        );
    }

    if (formMonthlySavingsElement) {
        formMonthlySavingsElement.textContent = formatCurrency(
            data.monthlySavings
        );
    }
}


function updateHiddenSimulationFields(data) {
    hiddenBillValueInput.value = data.billValue.toFixed(2);
    hiddenMonthlySavingsInput.value =
        data.monthlySavings.toFixed(2);
    hiddenAnnualSavingsInput.value =
        data.annualSavings.toFixed(2);
}


function resetSimulation() {
    billValueInput.value = "";
    billValueError.textContent = "";

    simulationData = createEmptySimulation();

    updateSimulationDisplay(simulationData);
    updateHiddenSimulationFields(simulationData);
}


function createEmptySimulation() {
    return {
        billValue: 0,
        eligibleValue: 0,
        monthlySavings: 0,
        annualSavings: 0,
        estimatedFinalValue: 0
    };
}


function formatCurrency(value) {
    return Number(value).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


/* =========================================================
   MÁSCARA CPF E CNPJ
========================================================= */

documentInput.addEventListener("input", () => {
    const numbers = documentInput.value.replace(/\D/g, "");

    documentInput.value =
        selectedProfile === "Residencial"
            ? formatCPF(numbers)
            : formatCNPJ(numbers);

    clearFieldError(documentInput);
});


function formatCPF(value) {
    return value
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}


function formatCNPJ(value) {
    return value
        .slice(0, 14)
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}


/* =========================================================
   VALIDAÇÃO
========================================================= */

leadForm.addEventListener("submit", (event) => {
    event.preventDefault();

    clearAllErrors();

    const profile = profileInput.value;
    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const documentValue = documentInput.value.trim();
    const documentNumbers = documentValue.replace(/\D/g, "");

    let isValid = true;

    if (simulationData.billValue < MINIMUM_BILL_VALUE) {
        formStep.hidden = true;
        calculatorStep.hidden = false;

        billValueError.textContent =
            "Realize novamente a simulação antes de continuar.";

        billValueInput.focus();

        return;
    }

    if (fullName.length < 3 || !fullName.includes(" ")) {
        setFieldError(
            nameInput,
            "Digite seu nome completo."
        );

        isValid = false;
    }

    if (!isValidEmail(email)) {
        setFieldError(
            emailInput,
            "Digite um endereço de e-mail válido."
        );

        isValid = false;
    }

    if (profile === "Residencial") {
        if (
            documentNumbers.length !== 11 ||
            !isValidCPF(documentNumbers)
        ) {
            setFieldError(
                documentInput,
                "Digite um CPF válido."
            );

            isValid = false;
        }
    } else {
        if (
            documentNumbers.length !== 14 ||
            !isValidCNPJ(documentNumbers)
        ) {
            setFieldError(
                documentInput,
                "Digite um CNPJ válido."
            );

            isValid = false;
        }
    }

    if (!privacyConsent.checked) {
        window.alert(
            "Para continuar, aceite a Política de Privacidade."
        );

        isValid = false;
    }

    if (!isValid) {
        const firstError = leadForm.querySelector(
            ".form-field.has-error input"
        );

        firstError?.focus();

        return;
    }

    openRegistrationWhatsApp({
        profile,
        fullName,
        email,
        documentValue,
        simulation: simulationData
    });
});


function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}


function isValidCPF(cpf) {
    if (!/^\d{11}$/.test(cpf)) {
        return false;
    }

    if (/^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    let sum = 0;

    for (let index = 0; index < 9; index += 1) {
        sum += Number(cpf[index]) * (10 - index);
    }

    let firstDigit = (sum * 10) % 11;

    if (firstDigit === 10) {
        firstDigit = 0;
    }

    if (firstDigit !== Number(cpf[9])) {
        return false;
    }

    sum = 0;

    for (let index = 0; index < 10; index += 1) {
        sum += Number(cpf[index]) * (11 - index);
    }

    let secondDigit = (sum * 10) % 11;

    if (secondDigit === 10) {
        secondDigit = 0;
    }

    return secondDigit === Number(cpf[10]);
}


function isValidCNPJ(cnpj) {
    if (!/^\d{14}$/.test(cnpj)) {
        return false;
    }

    if (/^(\d)\1{13}$/.test(cnpj)) {
        return false;
    }

    const calculateDigit = (base, weights) => {
        const sum = base
            .split("")
            .reduce(
                (total, digit, index) =>
                    total + Number(digit) * weights[index],
                0
            );

        const remainder = sum % 11;

        return remainder < 2 ? 0 : 11 - remainder;
    };

    const firstDigit = calculateDigit(
        cnpj.slice(0, 12),
        [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    );

    const secondDigit = calculateDigit(
        cnpj.slice(0, 12) + firstDigit,
        [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    );

    return (
        firstDigit === Number(cnpj[12]) &&
        secondDigit === Number(cnpj[13])
    );
}


function setFieldError(input, message) {
    const formField = input.closest(".form-field");
    const errorElement = formField.querySelector(".field-error");

    formField.classList.add("has-error");
    input.setAttribute("aria-invalid", "true");

    if (errorElement) {
        errorElement.textContent = message;
    }
}


function clearFieldError(input) {
    const formField = input.closest(".form-field");

    if (!formField) {
        return;
    }

    const errorElement = formField.querySelector(".field-error");

    formField.classList.remove("has-error");
    input.removeAttribute("aria-invalid");

    if (errorElement) {
        errorElement.textContent = "";
    }
}


function clearAllErrors() {
    document
        .querySelectorAll(".form-field input")
        .forEach(clearFieldError);
}


[nameInput, emailInput].forEach((input) => {
    input.addEventListener("input", () => {
        clearFieldError(input);
    });
});


/* =========================================================
   WHATSAPP
========================================================= */

function openRegistrationWhatsApp({
    profile,
    fullName,
    email,
    documentValue,
    simulation
}) {
    const documentType =
        profile === "Residencial" ? "CPF" : "CNPJ";

    const message = [
        "Olá! Quero iniciar meu cadastro gratuito para análise de economia na conta de energia.",
        "",
        `Perfil: ${profile}`,
        `Nome completo: ${fullName}`,
        `E-mail: ${email}`,
        `${documentType}: ${documentValue}`,
        "",
        "*Simulação realizada:*",
        `Valor informado da conta: ${formatCurrency(
            simulation.billValue
        )}`,
        `Economia mensal estimada: ${formatCurrency(
            simulation.monthlySavings
        )}`,
        `Economia anual estimada: ${formatCurrency(
            simulation.annualSavings
        )}`,
        `Valor total estimado após a economia: ${formatCurrency(
            simulation.estimatedFinalValue
        )}`,
        "",
        "Aguardo o atendimento de um especialista da ATL Energy para continuar meu cadastro."
    ].join("\n");

    openWhatsApp(message);
}


whatsappContactButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
        event.preventDefault();

        const message =
            "Olá! Gostaria de falar com um especialista da ATL Energy sobre o desconto na conta de energia.";

        openWhatsApp(message);
    });
});


function openWhatsApp(message) {
    const whatsappURL =
        `https://wa.me/${WHATSAPP_NUMBER}` +
        `?text=${encodeURIComponent(message)}`;

    window.open(
        whatsappURL,
        "_blank",
        "noopener,noreferrer"
    );
}


/* =========================================================
   MENU MOBILE
========================================================= */

if (mobileMenuButton && mobileNavigation) {
    mobileMenuButton.addEventListener("click", () => {
        const isOpen =
            mobileMenuButton.getAttribute("aria-expanded") === "true";

        setMobileMenuState(!isOpen);
    });

    mobileNavigation.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            setMobileMenuState(false);
        });
    });
}


function setMobileMenuState(isOpen) {
    if (!mobileMenuButton || !mobileNavigation) {
        return;
    }

    mobileMenuButton.setAttribute(
        "aria-expanded",
        String(isOpen)
    );

    mobileNavigation.setAttribute(
        "aria-hidden",
        String(!isOpen)
    );

    mobileNavigation.classList.toggle(
        "is-open",
        isOpen
    );

    document.body.classList.toggle(
        "mobile-menu-open",
        isOpen
    );
}


/* =========================================================
   FAQ
========================================================= */

faqQuestions.forEach((question) => {
    question.addEventListener("click", () => {
        const currentItem = question.closest(".faq-item");
        const currentAnswer = currentItem.querySelector(".faq-answer");

        const isOpen =
            question.getAttribute("aria-expanded") === "true";

        faqQuestions.forEach((otherQuestion) => {
            const otherItem = otherQuestion.closest(".faq-item");
            const otherAnswer = otherItem.querySelector(".faq-answer");

            otherQuestion.setAttribute(
                "aria-expanded",
                "false"
            );

            otherItem.classList.remove("is-open");
            otherAnswer.hidden = true;
        });

        if (!isOpen) {
            question.setAttribute(
                "aria-expanded",
                "true"
            );

            currentItem.classList.add("is-open");
            currentAnswer.hidden = false;
        }
    });
});


/* =========================================================
   MODAL DA LEI
========================================================= */

lawModalTrigger.addEventListener("click", () => {
    openLawModal();
});


lawModalCloseButtons.forEach((button) => {
    button.addEventListener("click", () => {
        closeLawModal();
    });
});


document.addEventListener("keydown", (event) => {
    if (
        event.key === "Escape" &&
        lawModal.classList.contains("is-open")
    ) {
        closeLawModal();

        return;
    }

    if (
        event.key === "Tab" &&
        lawModal.classList.contains("is-open")
    ) {
        keepFocusInsideLawModal(event);
    }
});


function openLawModal() {
    lastFocusedElement = document.activeElement;

    lawModal.classList.add("is-open");
    lawModal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");

    window.setTimeout(() => {
        lawModalClose.focus();
    }, 50);
}


function closeLawModal() {
    lawModal.classList.remove("is-open");
    lawModal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");

    if (lastFocusedElement) {
        lastFocusedElement.focus();
    }
}


function keepFocusInsideLawModal(event) {
    const focusableElements = lawModal.querySelectorAll(
        [
            "a[href]",
            "button:not([disabled])",
            "input:not([disabled])",
            "select:not([disabled])",
            "textarea:not([disabled])",
            '[tabindex]:not([tabindex="-1"])'
        ].join(",")
    );

    if (!focusableElements.length) {
        return;
    }

    const firstElement = focusableElements[0];
    const lastElement =
        focusableElements[focusableElements.length - 1];

    if (
        event.shiftKey &&
        document.activeElement === firstElement
    ) {
        event.preventDefault();
        lastElement.focus();

        return;
    }

    if (
        !event.shiftKey &&
        document.activeElement === lastElement
    ) {
        event.preventDefault();
        firstElement.focus();
    }
}

/* =========================================================
   ANIMAÇÕES DE ENTRADA E MICROINTERAÇÕES
========================================================= */

function initializeScrollAnimations() {
    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const animationGroups = [
        {
            selector: ".discount-path-heading, .audience-heading, .journey-heading, .faq-heading",
            variant: "reveal-scale"
        },
        {
            selector: ".discount-path-picture",
            variant: "reveal-scale"
        },
        {
            selector: ".audience-card",
            variant: "reveal-scale",
            stagger: 110
        },
        {
            selector: ".audience-eligibility",
            variant: "reveal-scale"
        },
        {
            selector: ".journey-card",
            variant: "reveal-scale",
            stagger: 85
        },
        {
            selector: ".journey-specialist-box",
            variant: "reveal-scale"
        },
        {
            selector: ".faq-item",
            variant: "reveal-on-scroll",
            stagger: 45
        },
        {
            selector: ".final-cta-content",
            variant: "reveal-left"
        }
    ];

    const revealElements = [];

    animationGroups.forEach((group) => {
        document.querySelectorAll(group.selector).forEach((element, index) => {
            element.classList.add("reveal-on-scroll");

            if (group.variant && group.variant !== "reveal-on-scroll") {
                element.classList.add(group.variant);
            }

            if (group.stagger) {
                element.style.setProperty(
                    "--reveal-delay",
                    `${Math.min(index * group.stagger, 420)}ms`
                );
            }

            revealElements.push(element);
        });
    });

    document.documentElement.classList.add("js-ready");

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
        revealElements.forEach((element) => {
            element.classList.add("is-visible");
        });

        return;
    }

    const observer = new IntersectionObserver(
        (entries, currentObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add("is-visible");
                currentObserver.unobserve(entry.target);
            });
        },
        {
            threshold: 0.12,
            rootMargin: "0px 0px -7% 0px"
        }
    );

    revealElements.forEach((element) => {
        observer.observe(element);
    });
}


function initializeRegistrationHighlight() {
    if (!registrationCard) {
        return;
    }

    registrationScrollButtons.forEach((button) => {
        button.addEventListener("click", () => {
            window.setTimeout(() => {
                registrationCard.classList.remove("registration-highlight");

                void registrationCard.offsetWidth;

                registrationCard.classList.add("registration-highlight");
            }, 520);
        });
    });

    registrationCard.addEventListener("animationend", (event) => {
        if (event.animationName === "registrationHighlight") {
            registrationCard.classList.remove("registration-highlight");
        }
    });
}


function initializeSavingsFeedback() {
    const savingsResult = document.getElementById("savings-result");

    if (!savingsResult || !billValueInput) {
        return;
    }

    let feedbackTimer = null;

    billValueInput.addEventListener("input", () => {
        window.clearTimeout(feedbackTimer);

        feedbackTimer = window.setTimeout(() => {
            if (getBillValue() < MINIMUM_BILL_VALUE) {
                return;
            }

            savingsResult.classList.remove("is-updated");

            void savingsResult.offsetWidth;

            savingsResult.classList.add("is-updated");
        }, 120);
    });

    savingsResult.addEventListener("animationend", () => {
        savingsResult.classList.remove("is-updated");
    });
}


function initializeMicroInteractions() {
    initializeScrollAnimations();
    initializeRegistrationHighlight();
    initializeSavingsFeedback();
}


if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeMicroInteractions,
        { once: true }
    );
} else {
    initializeMicroInteractions();
}
