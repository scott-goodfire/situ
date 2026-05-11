CREATE TABLE `app_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `app_events_created_idx` ON `app_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_by_research_task_id` text,
	`created_by_agent_id` text,
	`entity_kind` text NOT NULL,
	`entity_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`path` text NOT NULL,
	`media_type` text,
	`size_bytes` integer,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by_research_task_id`) REFERENCES `research_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `baseline_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`baseline_id` text NOT NULL,
	`actor_agent_id` text,
	`actor` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`baseline_id`) REFERENCES `baselines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `baselines` (
	`id` text PRIMARY KEY NOT NULL,
	`created_by_research_task_id` text,
	`created_by_agent_id` text,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`status` text DEFAULT 'triage' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by_research_task_id`) REFERENCES `research_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `claude_agent_environments` (
	`id` text PRIMARY KEY NOT NULL,
	`claude_environment_id` text NOT NULL,
	`name` text NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `claude_agent_environments_claude_environment_id_idx` ON `claude_agent_environments` (`claude_environment_id`);--> statement-breakpoint
CREATE TABLE `claude_agent_events` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text,
	`claude_event_id` text,
	`type` text NOT NULL,
	`payload_json` text NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `claude_agent_events_created_idx` ON `claude_agent_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `claude_agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text,
	`work_item_id` text,
	`claude_session_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempt` integer DEFAULT 0 NOT NULL,
	`last_event_id` text,
	`last_event_at` text,
	`lease_expires_at` text,
	`error_message` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`work_item_id`) REFERENCES `work_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `claude_agent_runs_status_idx` ON `claude_agent_runs` (`status`,`updated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `claude_agent_runs_work_item_idx` ON `claude_agent_runs` (`work_item_id`);--> statement-breakpoint
CREATE TABLE `claude_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`display_name` text NOT NULL,
	`claude_agent_id` text,
	`claude_agent_version` integer,
	`claude_session_id` text,
	`model` text,
	`status` text DEFAULT 'idle' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `claude_agents_claude_agent_id_idx` ON `claude_agents` (`claude_agent_id`);--> statement-breakpoint
CREATE TABLE `compute_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`pool` text NOT NULL,
	`kind` text DEFAULT 'local' NOT NULL,
	`label` text,
	`status` text DEFAULT 'idle' NOT NULL,
	`claimed_by_research_task_id` text,
	`claimed_at` text,
	`lease_expires_at` text,
	`last_heartbeat` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`claimed_by_research_task_id`) REFERENCES `research_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `compute_targets_pool_status_idx` ON `compute_targets` (`pool`,`status`);--> statement-breakpoint
CREATE TABLE `entity_links` (
	`id` text PRIMARY KEY NOT NULL,
	`from_kind` text NOT NULL,
	`from_id` text NOT NULL,
	`to_kind` text NOT NULL,
	`to_id` text NOT NULL,
	`relationship` text NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evaluation_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`evaluation_id` text NOT NULL,
	`actor_agent_id` text,
	`actor` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`evaluation_id`) REFERENCES `evaluations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_by_research_task_id` text,
	`created_by_agent_id` text,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`status` text DEFAULT 'triage' NOT NULL,
	`associated_baseline_id` text,
	`associated_experiment_id` text,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by_research_task_id`) REFERENCES `research_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`associated_baseline_id`) REFERENCES `baselines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`associated_experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `experiment_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`experiment_id` text NOT NULL,
	`actor_agent_id` text,
	`actor` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`created_by_research_task_id` text,
	`created_by_agent_id` text,
	`parent_experiment_id` text,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`status` text DEFAULT 'triage' NOT NULL,
	`worktree_path` text,
	`base_commit` text,
	`candidate_commit` text,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by_research_task_id`) REFERENCES `research_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hypotheses` (
	`id` text PRIMARY KEY NOT NULL,
	`created_by_research_task_id` text,
	`created_by_agent_id` text,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`status` text DEFAULT 'triage' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by_research_task_id`) REFERENCES `research_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hypothesis_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hypothesis_id` text NOT NULL,
	`actor_agent_id` text,
	`actor` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hypothesis_id`) REFERENCES `hypotheses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hypothesis_experiment_links` (
	`hypothesis_id` text NOT NULL,
	`experiment_id` text NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`hypothesis_id`, `experiment_id`),
	FOREIGN KEY (`hypothesis_id`) REFERENCES `hypotheses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `local_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`anthropic_key_configured` integer DEFAULT false NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`created_by_research_task_id` text,
	`created_by_agent_id` text,
	`evaluation_id` text NOT NULL,
	`actor` text NOT NULL,
	`body` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by_research_task_id`) REFERENCES `research_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evaluation_id`) REFERENCES `evaluations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `replicache_clients` (
	`id` text PRIMARY KEY NOT NULL,
	`client_group_id` text NOT NULL,
	`last_mutation_id` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_project_interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`research_project_id` text NOT NULL,
	`kind` text NOT NULL,
	`prompt` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`response` text,
	`created_by_agent_id` text,
	`resolved_at` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`research_project_id`) REFERENCES `research_projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `research_project_interactions_status_idx` ON `research_project_interactions` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `research_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`goal` text NOT NULL,
	`phase` text DEFAULT 'onboarding' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`baseline_summary` text,
	`result_summary` text,
	`created_by_agent_id` text,
	`started_at` text,
	`completed_at` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `research_projects_status_created_idx` ON `research_projects` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `research_task_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`research_task_id` text NOT NULL,
	`profile` text DEFAULT 'general' NOT NULL,
	`status` text NOT NULL,
	`verifier_prompt` text NOT NULL,
	`judgment` text NOT NULL,
	`evidence_summary` text DEFAULT '' NOT NULL,
	`created_by_agent_id` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`research_task_id`) REFERENCES `research_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `research_task_verifications_task_idx` ON `research_task_verifications` (`research_task_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `research_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`research_project_id` text NOT NULL,
	`parent_research_task_id` text,
	`type` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`title` text NOT NULL,
	`worker_prompt` text NOT NULL,
	`verification_prompt` text NOT NULL,
	`result_summary` text,
	`target_kind` text,
	`target_id` text,
	`created_by_agent_id` text,
	`started_at` text,
	`completed_at` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`research_project_id`) REFERENCES `research_projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_research_task_id`) REFERENCES `research_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `research_tasks_project_status_idx` ON `research_tasks` (`research_project_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`objective` text DEFAULT '' NOT NULL,
	`repo_path` text DEFAULT '' NOT NULL,
	`workspace_key` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`claude_session_id` text,
	`claude_environment_id` text,
	`closed_at` text,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_claude_session_id_idx` ON `session` (`claude_session_id`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `sync_state` (`id`, `version`) VALUES ('global', 1);
--> statement-breakpoint
CREATE TABLE `work_items` (
	`id` text PRIMARY KEY NOT NULL,
	`purpose` text NOT NULL,
	`target_kind` text NOT NULL,
	`target_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`owner_agent_id` text,
	`owner_workflow_id` text,
	`attempt` integer DEFAULT 0 NOT NULL,
	`available_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`claimed_at` text,
	`lease_expires_at` text,
	`completed_at` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `work_items_status_available_idx` ON `work_items` (`status`,`available_at`);--> statement-breakpoint
CREATE INDEX `work_items_lease_idx` ON `work_items` (`status`,`lease_expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `work_items_open_target_unique` ON `work_items` (`purpose`,`target_kind`,`target_id`) WHERE "work_items"."status" IN ('pending', 'claimed');
