PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_baselines` (
	`id` text PRIMARY KEY NOT NULL,
	`research_project_id` text NOT NULL,
	`created_by_research_task_id` text,
	`created_by_agent_id` text,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`status` text DEFAULT 'triage' NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`sync_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`research_project_id`) REFERENCES `research_projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_research_task_id`) REFERENCES `research_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_agent_id`) REFERENCES `claude_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_baselines` (
	`id`,
	`research_project_id`,
	`created_by_research_task_id`,
	`created_by_agent_id`,
	`title`,
	`summary`,
	`status`,
	`payload_json`,
	`sync_version`,
	`sync_deleted`,
	`created_at`,
	`updated_at`
)
SELECT
	`baselines`.`id`,
	`research_tasks`.`research_project_id`,
	`baselines`.`created_by_research_task_id`,
	`baselines`.`created_by_agent_id`,
	`baselines`.`title`,
	`baselines`.`summary`,
	`baselines`.`status`,
	'{}',
	`baselines`.`sync_version`,
	`baselines`.`sync_deleted`,
	`baselines`.`created_at`,
	`baselines`.`updated_at`
FROM `baselines`
LEFT JOIN `research_tasks`
	ON `research_tasks`.`id` = `baselines`.`created_by_research_task_id`;--> statement-breakpoint
DROP TABLE `baselines`;--> statement-breakpoint
ALTER TABLE `__new_baselines` RENAME TO `baselines`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
