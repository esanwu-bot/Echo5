<?php
// +----------------------------------------------------------------------
// | 控制台配置
// +----------------------------------------------------------------------
return [
    // 指令定义
    'commands' => [
        app\command\CreateAdminCommand::class,
        app\command\CheckDatabaseTablesCommand::class,
        app\command\CheckTableStructureCommand::class,
        app\command\ImportTestDataCommand::class,
        app\command\ImportElectronicComponentsDataCommand::class,
        app\command\TranslateTestCommand::class,
        app\command\LangMigrateCommand::class,
        app\command\LangBenchmarkCommand::class,
        app\command\ApiLangTranslateCommand::class,
        app\command\BusinessTranslateCommand::class,
        app\command\I18nSyncAllCommand::class,
        app\command\RefreshSpecSummaryCommand::class,
    ],
];
