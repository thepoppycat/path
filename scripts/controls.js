// myUI.map_start;
// myUI.map_goal;
// myUI.map_arr;
// myUI.planners => array of planners
// myUI.planner_choice => references the index of the planner in myUI.planners;

/* registers & starts searching for path on the given map using the given solver */
document.getElementById("compute_btn").addEventListener("click", compute_path);

function compute_path(){
	myUI.reset_animation();  // reset first time for arrows to be removed
	myUI.arrow.data.forEach(el=>el.remove());
	myUI.arrow.data = [];
	if(!myUI.planner_choice) return alert("no planner loaded!");
	if(!myUI.map_arr) return alert("no map loaded!");
  if(!myUI.map_start) return alert("no scene loaded!");
	myUI.planner = new myUI.planners[myUI.planner_choice]();
	myUI.planner.add_map(myUI.map_arr);
// convert array to new planner 
	myUI.path = myUI.planner.search(myUI.map_start, myUI.map_goal); 
	myUI.animation.all_steps_fwd = myUI.planner.all_steps();
  myUI.animation.all_steps_bck = myUI.planner.all_steps(bck=true);
	myUI.animation.max_step = myUI.animation.all_steps_fwd.length-2;  // because of dummy step at the end and final step is n-1
	myUI.sliders.search_progress_slider.elem.max = myUI.animation.max_step+1;
	let each_frame_duration_min = 3000 / myUI.animation.max_step; //  5 seconds for fastest animation
	myUI.sliders.animation_speed_slider.elem.max = Math.log2(200/each_frame_duration_min)*1000;
	
}

/* displays the solved path */
document.getElementById("display_btn").addEventListener("click", display_path);

function display_path(){
	if(!myUI.planner_choice) return alert("no planner loaded!");
	if(!myUI.map_arr) return alert("no map loaded!");
  if(!myUI.map_start) return alert("no scene loaded!");
	if(!myUI.planner) return alert("not computed");

  let final_state = myUI.planner.final_state();
  if(final_state.length<=1) return;

  let path = final_state.path; // array of coordinates
  myUI.canvases.path.draw_canvas(path, "1d");
}
//displays value of slider

myUI.sliders.animation_speed_slider.elem.oninput = function(){
	let apparent_speed = Math.pow(2, this.value/1000);
	this.parent.label.innerHTML = `${(Math.round(apparent_speed * 100) / 100).toFixed(2)}×`;
	myUI.animation.speed = apparent_speed;
	// skip steps in animation
	myUI.animation.jump_steps = 5*myUI.animation.speed/myUI.animation.max_fps;
	myUI.animation.jump_steps = Math.pow(myUI.animation.jump_steps, 1.5);
	//console.log(myUI.animation.jump_steps);
}

myUI.sliders.search_progress_slider.elem.oninput = function(){
	myUI.stop_animation(change_svg = myUI.animation.running);
	myUI.update_search_slider(this.value);
	myUI.jump_to_step(this.value);
}

myUI.reset_animation = function(){
	myUI.stop_animation(myUI.animation.running); //stop animation if scen changed halfway while still animating
	myUI.update_search_slider(0);
	["visited",	"neighbours", "queue",	"current_YX",	"path"].forEach(canvas_id=>{
		myUI.canvases[canvas_id].erase_canvas();
	});
	myUI.arrow.data.forEach(el=>el.classList.add(`hidden`));
	myUI.arrow.step = -1;
}

myUI.buttons.clear_btn.btn.addEventListener("click", myUI.reset_animation);


myUI.step_back = function(){
	myUI.stop_animation(change_svg = true);
	/* NEW */
	if(myUI.animation.detailed)
		myUI.run_single_step(inverse=true);
	else
		myUI.run_combined_step(inverse=true);
	myUI.update_search_slider(myUI.animation.step);
	console.log(myUI.animation.step);
}
myUI.buttons.back_btn.btn.addEventListener("click", myUI.step_back);


myUI.start_animation = function(){
	myUI.animation.running = true;
	animation_backend();
}

myUI.stop_animation = function(change_svg = false){
	if(change_svg && myUI.animation.running)
		myUI.buttons.start_pause_btn.next_svg();
	myUI.animation.running = false;
}

myUI.step_forward = function(){
	myUI.stop_animation(change_svg = true);
	/* NEW */
	if(myUI.animation.detailed)
		myUI.run_single_step();
	else
		myUI.run_combined_step();
	myUI.update_search_slider(myUI.animation.step);
	console.log(myUI.animation.step);
}
myUI.buttons.forward_btn.btn.addEventListener("click", myUI.step_forward);


myUI.jump_to_end = function(){
	myUI.stop_animation(change_svg = true);
	//myUI.animation.step = -1;  //  change ot end
	myUI.update_search_slider(myUI.animation.max_step);
	myUI.jump_to_step(myUI.animation.max_step);
	return
}
myUI.buttons.end_btn.btn.addEventListener("click", myUI.jump_to_end);


myUI.toggleAnimation = function(){
	if(!myUI.planner_choice) return alert("no planner loaded!");
	if(!myUI.map_arr) return alert("no map loaded!");
  if(!myUI.map_start) return alert("no scene loaded!");
	if(!myUI.planner) return alert("not computed");
	myUI.buttons.start_pause_btn.next_svg();
	if(myUI.animation.running)
		myUI.stop_animation();
	else
		myUI.start_animation();
}
myUI.buttons.start_pause_btn.btn.addEventListener("click", myUI.toggleAnimation);



myUI.toggleMapDetail = function(){
	myUI.buttons.detail_btn.next_svg();

	myUI.animation.detailed = !myUI.animation.detailed;
	// do other stuff
}
myUI.buttons.detail_btn.btn.addEventListener("click", myUI.toggleMapDetail);

myUI.toggleDrawErase = function(){
	myUI.buttons.draw_erase_btn.next_svg();
	myUI.canvases.edit_map.toggle_draw_erase();
}
myUI.buttons.draw_erase_btn.btn.addEventListener("click", myUI.toggleDrawErase);
