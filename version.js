// Auto-generated version file
// Build: 1.10.5-bbed730-mf7bend4

module.exports = {
    version: '1.10.5',
    buildDate: '2025-09-05',
    buildTimestamp: 1757105767624,
    buildId: '1.10.5-bbed730-mf7bend4',
    commit: 'bbed730',
    branch: 'main',
    
    // Compatibility with existing code
    getBuildInfo: () => ({
    "app": {
        "name": "assistente-balcao",
        "productName": "Filipeta Assistente de Balcão",
        "version": "1.10.5",
        "description": "Assistente de balcão em formato filipeta - Versão Unificada"
    },
    "build": {
        "date": "2025-09-05",
        "timestamp": 1757105767624,
        "iso": "2025-09-05T20:56:07.982Z",
        "year": 2025
    },
    "git": {
        "branch": "main",
        "commit": "bbed730",
        "commitLong": "bbed7304abb503782dbc39f00af6c3a9694e66b4",
        "commitDate": "2025-09-05 16:56:07 -0400",
        "author": "barbosaj1983",
        "status": "clean",
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
        "generatedAt": "2025-09-05T20:56:07.982Z",
        "buildId": "1.10.5-bbed730-mf7bend4",
        "environment": "production"
    }
}),
    
    // Helper methods
    getVersionString: () => `v${module.exports.version} (${module.exports.commit})`,
    getBuildString: () => `Build ${module.exports.buildId}`,
    getFullVersionString: () => `${module.exports.getVersionString()} - ${module.exports.getBuildString()}`
};
