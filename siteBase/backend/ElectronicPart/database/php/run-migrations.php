<?php
/**
 * Wine Shop Database Migration Runner
 * 
 * This script runs all migrations to set up the database structure
 * based on the existing migration files.
 */

// Set the current working directory to the project root
chdir(dirname(__DIR__));

// Check if this is being run from the command line
if (PHP_SAPI !== 'cli') {
    exit('This script can only be run from the command line.');
}

echo "Running Wine Shop database migrations...\n";

// Execute the migration command
$command = 'php think migrate:run';
$output = [];
$returnVar = 0;

exec($command, $output, $returnVar);

// Display the output
foreach ($output as $line) {
    echo $line . "\n";
}

// Check if the command was successful
if ($returnVar === 0) {
    echo "\nDatabase migration completed successfully!\n";
} else {
    echo "\nDatabase migration failed with error code: $returnVar\n";
}