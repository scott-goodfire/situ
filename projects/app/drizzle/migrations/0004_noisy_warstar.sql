CREATE TABLE `feed_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`research_project_id` text NOT NULL,
	`summary_markdown` text NOT NULL,
	`severity` text NOT NULL,
	`cited_app_event_ids_json` text DEFAULT '[]' NOT NULL,
	`window_started_at` text NOT NULL,
	`window_ended_at` text NOT NULL,
	`created_by_agent_id` text,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`research_project_id`) REFERENCES `research_projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `feed_entries_project_created_idx` ON `feed_entries` (`research_project_id`,`created_at`);