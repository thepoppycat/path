myUI.modals.planner_config.show = function(){
  show_modal(myUI.modals.planner_config.elem);
  document.addEventListener("keydown", modal_await_keypress);
}

// When the user clicks on the button, open the modal
myUI.buttons.planner_config_btn.btn.addEventListener("click", myUI.modals.planner_config.show);

myUI.modals.planner_config.close = function(){
  hide_modal(myUI.modals.planner_config.elem);
}
myUI.modals.planner_config.close_btn.addEventListener("click", myUI.modals.planner_config.close);
																									myUI.modals.planner_config.elem.style.display = "none";

window.addEventListener("click", event=>{
	if (event.target == myUI.modals.planner_config.elem)
		myUI.modals.planner_config.close();
});