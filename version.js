// Auto-generated version file
// Build: 1.10.11-cb1c40f-mffvvhdf

module.exports = {
    version: '1.10.11',
    buildDate: '2025-09-11',
    buildTimestamp: 1757623874739,
    buildId: '1.10.11-cb1c40f-mffvvhdf',
    commit: 'cb1c40f',
    branch: 'main',
    
    // Compatibility with existing code
    getBuildInfo: () => ({
    "app": {
        "name": "assistente-balcao",
        "productName": "Filipeta Assistente de Balcão",
        "version": "1.10.11",
        "description": "Assistente de balcão em formato filipeta - Versão Unificada"
    },
    "build": {
        "date": "2025-09-11",
        "timestamp": 1757623874739,
        "iso": "2025-09-11T20:51:15.136Z",
        "year": 2025
    },
    "git": {
        "branch": "main",
        "commit": "cb1c40f",
        "commitLong": "cb1c40f3cf6f3d7ffa8ef765747a01f9801b5475",
        "commitDate": "2025-09-11 16:51:14 -0400",
        "author": "barbosaj1983",
        "status": "dirty",
        "repository": "https://github.com/barbosaj1983/filipeta.git"
    },
    "system": {
        "platform": "win32",
        "arch": "x64",
        "nodeVersion": "v22.19.0",
        "npmVersion": "11.5.2",
        "electronVersion": "30.5.1"
    },
    "dependencies": {
        "electron": "30.5.1",
        "node": "22.19.0",
        "npm": "11.5.2"
    },
    "metadata": {
        "generator": "Filipeta Build Info Generator",
        "generatedAt": "2025-09-11T20:51:15.136Z",
        "buildId": "1.10.11-cb1c40f-mffvvhdf",
        "environment": "production"
    }
}),
    
    // Helper methods
    getVersionString: () => `v${module.exports.version} (${module.exports.commit})`,
    getBuildString: () => `Build ${module.exports.buildId}`,
    getFullVersionString: () => `${module.exports.getVersionString()} - ${module.exports.getBuildString()}`
};
