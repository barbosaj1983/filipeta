// Auto-generated version file
// Build: 1.10.2-b2168c4-mf761toq

module.exports = {
    version: '1.10.2',
    buildDate: '2025-09-05',
    buildTimestamp: 1757096771210,
    buildId: '1.10.2-b2168c4-mf761toq',
    commit: 'b2168c4',
    branch: 'main',
    
    // Compatibility with existing code
    getBuildInfo: () => ({
    "app": {
        "name": "assistente-balcao",
        "productName": "Filipeta Assistente de Balcão",
        "version": "1.10.2",
        "description": "Assistente de balcão em formato filipeta - Versão Unificada"
    },
    "build": {
        "date": "2025-09-05",
        "timestamp": 1757096771210,
        "iso": "2025-09-05T18:26:11.617Z",
        "year": 2025
    },
    "git": {
        "branch": "main",
        "commit": "b2168c4",
        "commitLong": "b2168c4da179b5c5352b205dc7916222e350311b",
        "commitDate": "2025-09-05 14:26:11 -0400",
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
        "generatedAt": "2025-09-05T18:26:11.617Z",
        "buildId": "1.10.2-b2168c4-mf761toq",
        "environment": "production"
    }
}),
    
    // Helper methods
    getVersionString: () => `v${module.exports.version} (${module.exports.commit})`,
    getBuildString: () => `Build ${module.exports.buildId}`,
    getFullVersionString: () => `${module.exports.getVersionString()} - ${module.exports.getBuildString()}`
};
