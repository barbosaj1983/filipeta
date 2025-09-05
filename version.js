// Auto-generated version file
// Build: 1.10.3-36a895b-mf7am5gr

module.exports = {
    version: '1.10.3',
    buildDate: '2025-09-05',
    buildTimestamp: 1757104438059,
    buildId: '1.10.3-36a895b-mf7am5gr',
    commit: '36a895b',
    branch: 'main',
    
    // Compatibility with existing code
    getBuildInfo: () => ({
    "app": {
        "name": "assistente-balcao",
        "productName": "Filipeta Assistente de Balcão",
        "version": "1.10.3",
        "description": "Assistente de balcão em formato filipeta - Versão Unificada"
    },
    "build": {
        "date": "2025-09-05",
        "timestamp": 1757104438059,
        "iso": "2025-09-05T20:33:58.459Z",
        "year": 2025
    },
    "git": {
        "branch": "main",
        "commit": "36a895b",
        "commitLong": "36a895bcdc6c49858473fd0b3daf3f9fe44e3ce2",
        "commitDate": "2025-09-05 16:33:57 -0400",
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
        "generatedAt": "2025-09-05T20:33:58.459Z",
        "buildId": "1.10.3-36a895b-mf7am5gr",
        "environment": "production"
    }
}),
    
    // Helper methods
    getVersionString: () => `v${module.exports.version} (${module.exports.commit})`,
    getBuildString: () => `Build ${module.exports.buildId}`,
    getFullVersionString: () => `${module.exports.getVersionString()} - ${module.exports.getBuildString()}`
};
