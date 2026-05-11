DROP TABLE `hypothesis_experiment_links`;--> statement-breakpoint
ALTER TABLE `experiments` ADD `associated_hypothesis_id` text NOT NULL REFERENCES hypotheses(id);