<?php
use think\facade\Route;

// Dictionary API routes
Route::group('dictionary', function () {
    // Project management
    Route::get('projects', 'api/DictionaryController/getProjects');
    Route::get('projects/:id', 'api/DictionaryController/getProject');
    Route::get('projects/code/:code', 'api/DictionaryController/getProjectByCode');
    Route::post('projects', 'api/DictionaryController/createProject');
    Route::put('projects/:id', 'api/DictionaryController/updateProject');
    Route::delete('projects/:id', 'api/DictionaryController/deleteProject');
    
    // Data management
    Route::get('projects/:project_id/data', 'api/DictionaryController/getDataList');
    Route::get('data/:id', 'api/DictionaryController/getData');
    Route::post('projects/:project_id/data', 'api/DictionaryController/createData');
    Route::put('data/:id', 'api/DictionaryController/updateData');
    Route::delete('data/:id', 'api/DictionaryController/deleteData');
    
    // Field types
    Route::get('field-types', 'api/DictionaryController/getFieldTypes');
    Route::get('data-types', 'api/DictionaryController/getDataTypes');
});
?>