// Auto-generated version file
// Build: 1.10.4-b103f84-mf7b6nlm

module.exports = {
    version: '1.10.4',
    buildDate: '2025-09-05',
    buildTimestamp: 1757105394682,
    buildId: '1.10.4-b103f84-mf7b6nlm',
    commit: 'b103f84',
    branch: 'main',
    
    // Compatibility with existing code
    getBuildInfo: () => ({
    "app": {
        "name": "assistente-balcao",
        "productName": "Filipeta Assistente de Balcão",
        "version": "1.10.4",
        "description": "Assistente de balcão em formato filipeta - Versão Unificada"
    },
    "build": {
        "date": "2025-09-05",
        "timestamp": 1757105394682,
        "iso": "2025-09-05T20:49:55.084Z",
        "year": 2025
    },
    "git": {
        "branch": "main",
        "commit": "b103f84",
        "commitLong": "b103f8437fd147146d169bd01c347188f5176e8c",
        "commitDate": "2025-09-05 16:49:54 -0400",
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
        "generatedAt": "2025-09-05T20:49:55.084Z",
        "buildId": "1.10.4-b103f84-mf7b6nlm",
        "environment": "production"
    }
}),
    
    // Helper methods
    getVersionString: () => `v${module.exports.version} (${module.exports.commit})`,
    getBuildString: () => `Build ${module.exports.buildId}`,
    getFullVersionString: () => `${module.exports.getVersionString()} - ${module.exports.getBuildString()}`
};
