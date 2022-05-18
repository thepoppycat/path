const STATIC = {
  /* step markers */
  SIMPLE: 1, // shows that the step is a simple step
  /* commands (index 0) */
  DC: 11,  // draw canvas
  EC: 12,  // erase canvas
  DP: 13,  // draw pixel
  EP: 14,  // erase pixel
  DA: 15,  // draw arrow
  EA: 16,  // erase arrow
  /* canvases (index 1), must be the same as statics_to_obj*/ 
  QU: 21, // queue
  VI: 22, // visited
  CR: 23, // current
  NB: 24, // neighbours
  PA: 25, // path
}
    /*
    Actions
    - `dc`, draw canvas
    - `ec`, erase canvas
    - `dp`, draw pixel
    - `ep`, erase pixel
    - `ia`, infopane add
    - `ie`, infopane erase
  
    */
const statics_to_obj = {
  21: "queue",
  22: "visited",
  23: "current_YX",
  24: "neighbours",
  25: "path"
}

myUI.get_step = function(num, inverse=false){
  let step;
  if(myUI.db_step){
    step = inverse ? myUI.storage.get("step_bck", num+1) : myUI.storage.get("step_fwd", num);
  }
  else{
    step = inverse ? myUI.planner.all_steps(true)[num+1] : myUI.planner.all_steps()[num];
  }
  return step;
}

myUI.run_single_step = function(inverse=false, virtual=false){
  if(inverse && myUI.animation.step>-1)--myUI.animation.step;
  else if(!inverse && myUI.animation.step<myUI.animation.max_step) ++myUI.animation.step;
  else return;
  //console.log(target_step);
  //if(inverse) console.log(myUI.animation.step+1); else console.log(myUI.animation.step-1);
  let step = myUI.get_step(myUI.animation.step, inverse);
  step.forEach(action=>{
    if(action[0]==STATIC.DC){
      let canvas = action[1];
      if(virtual) myUI.draw_virtual_canvas(statics_to_obj[canvas], action[2], action[3]);
      else myUI.canvases[statics_to_obj[canvas]].draw_canvas(action[2], action[3]);
    }
    else if(action[0]==STATIC.EC){
      if(virtual) myUI.tmp.virtual_canvases[statics_to_obj[action[1]]] = zero2D(myUI.map_height, myUI.map_width);
      else myUI.canvases[statics_to_obj[action[1]]].erase_canvas();
    }
    else if(action[0]==STATIC.DP){
      if(virtual) myUI.tmp.virtual_canvases[statics_to_obj[action[1]]][action[2]][action[3]] = 1;
      else myUI.canvases[statics_to_obj[action[1]]].draw_pixel([action[2], action[3]]);
    }
    else if(action[0]==STATIC.EP){
      if(virtual) myUI.tmp.virtual_canvases[statics_to_obj[action[1]]][action[2]][action[3]] = 0;
      else myUI.canvases[statics_to_obj[action[1]]].erase_pixel([action[2], action[3]]);
    }
    else if(action[0]==STATIC.DA){
      // draw arrow
      ++myUI.arrow.step;
      myUI.arrow.data[myUI.arrow.step].classList.remove("hidden");
    }
    else if(action[0]==STATIC.EA){
      // erase arrow
      myUI.arrow.data[myUI.arrow.step].classList.add("hidden");
      --myUI.arrow.step;
    }
  });
}

/*
steps_arr = [
  each step: 
  [
    each action
    UInt8Array( (5)
      [action_type,args]
    );
  ]
]
*/


myUI.run_combined_step = function(inverse=false){
  let tmp_step = myUI.animation.step, start_step = myUI.animation.step;
  if(inverse){
    while(myUI.get_step(tmp_step, true)[0][0]!=STATIC.SIMPLE && tmp_step>0)
      --tmp_step;
    --tmp_step;
    for(let i=start_step;i>tmp_step;--i) myUI.run_single_step(inverse);
  }
  else{
    ++tmp_step;
    while(myUI.get_step(tmp_step+1, false)[0][0]!=STATIC.SIMPLE && tmp_step<myUI.animation.max_step-1)
      ++tmp_step;
    for(let i=start_step;i<tmp_step;++i) myUI.run_single_step( inverse);
  }
}