// Auto-generated version file
// Build: 1.10.6-9af6ce6-mf7dobm0

module.exports = {
    version: '1.10.6',
    buildDate: '2025-09-05',
    buildTimestamp: 1757109578184,
    buildId: '1.10.6-9af6ce6-mf7dobm0',
    commit: '9af6ce6',
    branch: 'main',
    
    // Compatibility with existing code
    getBuildInfo: () => ({
    "app": {
        "name": "assistente-balcao",
        "productName": "Filipeta Assistente de Balcão",
        "version": "1.10.6",
        "description": "Assistente de balcão em formato filipeta - Versão Unificada"
    },
    "build": {
        "date": "2025-09-05",
        "timestamp": 1757109578184,
        "iso": "2025-09-05T21:59:38.616Z",
        "year": 2025
    },
    "git": {
        "branch": "main",
        "commit": "9af6ce6",
        "commitLong": "9af6ce6a6c179d408cf5361bce82f3a0adaba45a",
        "commitDate": "2025-09-05 17:59:37 -0400",
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
        "generatedAt": "2025-09-05T21:59:38.616Z",
        "buildId": "1.10.6-9af6ce6-mf7dobm0",
        "environment": "production"
    }
}),
    
    // Helper methods
    getVersionString: () => `v${module.exports.version} (${module.exports.commit})`,
    getBuildString: () => `Build ${module.exports.buildId}`,
    getFullVersionString: () => `${module.exports.getVersionString()} - ${module.exports.getBuildString()}`
};
