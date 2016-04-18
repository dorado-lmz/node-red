function showTab(tab) {
    document.getElementById(tab + "Tab").className = "oneoffour orange";
    document.getElementById(tab).style.display = "block";
}

function hideTab(tab) {
    document.getElementById(tab + "Tab").className = "oneoffour white";
    document.getElementById(tab).style.display = "none";
}

var tabsModel = new fsm.StateMachine("tabs");
var initial = new fsm.PseudoState("initial", tabsModel, fsm.PseudoStateKind.Initial);
var overview = new fsm.State("overview", tabsModel).entry(function () { showTab("overview"); }).exit(function () { hideTab("overview"); });
var features = new fsm.State("features", tabsModel).entry(function () { showTab("features"); }).exit(function () { hideTab("features"); });
var examples = new fsm.State("examples", tabsModel).entry(function () { showTab("examples"); }).exit(function () { hideTab("examples"); });
var licensing = new fsm.State("licensing", tabsModel).entry(function () { showTab("licensing"); }).exit(function () { hideTab("licensing"); });

initial.to(overview);
overview.to(features).when(function (c) { return c === "features"; });
overview.to(examples).when(function (c) { return c === "examples"; });
overview.to(licensing).when(function (c) { return c === "licensing"; });
features.to(overview).when(function (c) { return c === "overview"; });
features.to(examples).when(function (c) { return c === "examples"; });
features.to(licensing).when(function (c) { return c === "licensing"; });
examples.to(overview).when(function (c) { return c === "overview"; });
examples.to(features).when(function (c) { return c === "features"; });
examples.to(licensing).when(function (c) { return c === "licensing"; });
licensing.to(overview).when(function (c) { return c === "overview"; });
licensing.to(features).when(function (c) { return c === "features"; });
licensing.to(examples).when(function (c) { return c === "examples"; });

var tabsContext = new fsm.Context();
