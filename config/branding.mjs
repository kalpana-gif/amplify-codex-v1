const organizationName = "KGM - SOLUTIONS";
const shortName = "EBMS";
const fullName = "Event Management Budgeting System";
const navigationTitle = "EBMS";
const consoleName = "Command Center";

export const BRANDING = Object.freeze({
  organizationName,
  shortName,
  fullName,
  navigationTitle,
  consoleName,
  appTitle: `${shortName} ${consoleName}`,
  metadataDescription:
    "Event budgeting, execution, reporting, and budget governance in one workspace.",
  loadingHeading: "Loading your command center",
  loadingDescription:
    "Checking your session and routing you to the right workspace.",
  reportsEmptyStateDescription: `Once an event is selected, ${shortName} will summarize the budget and show export-ready expense history.`,
});

export const getBrandMonogram = () =>
  shortName.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();

export const getVerificationEmailSubject = () =>
  `Verify your ${shortName} account`;

export const getVerificationEmailBody = (code) =>
  `Use this verification code to finish creating your ${fullName} account: ${code}`;
