// Cross-domain helpers that compose the baselines repository (in
// @situ/research-records) with research_projects updates and research-task
// resolution. The package's `baselineRepository` requires `researchProjectId`
// explicitly; these helpers fill in the resolution step.
export { createOrUpdateProjectBaseline } from "./create-or-update-project-baseline";
