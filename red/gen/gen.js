/**
 * Created by MAC on 15/10/15.
 */
function createNode(activeFlow) {
    var config = activeFlow.nodes;//除了Tab和subflows的所有节点
    for (var i=0;i<config.length;i++) {
        var nodeConfig = config[i];
        var nodeType = nodeConfig.type;
        log.info(nodeType);

    }
}


module.exports = {
    createNode: createNode
};