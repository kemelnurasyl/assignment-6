/*
 * Cake Mystery Assignment #6 — only jQuery is used for page behavior.
 * Individual student project. Data below is transcribed from the PDF picture.
 * Every selector case is implemented as a single jQuery DOM-search chain.
 */
(function ($) {
  'use strict';

  const COLOR = {red:'#e34f62', blue:'#3885df', green:'#22956f', black:'#243644', yellow:'#e8a323', purple:'#a064d7'};
  const ITEM_ICON = {phone:'📱', glasses:'👓', bag:'👜', cup:'☕', crumbs:'🍰'};
  const ITEM_NAME = {phone:'a phone',glasses:'glasses',bag:'a bag',cup:'a cup',crumbs:'cake crumbs'};
  const makeGuest = (name,color,time,aitu,items) => ({name,color,time,aitu,items:items.slice()});
  const INITIAL_ROOMS = [
    {id:'balcony', name:'Balcony', floor:2, guests:[
      makeGuest('Aigerim','green','20:45',true,['cup','crumbs']),
      makeGuest('Aliya','black','21:15',false,['phone','cup']),
      makeGuest('Madina','green','22:10',false,['phone','bag','crumbs']),
      makeGuest('Ivan','black','20:10',true,['cup'])
    ]},
    {id:'hall',name:'Hall',floor:2,guests:[
      makeGuest('Arman','yellow','20:35',false,['bag','glasses']),
      makeGuest('Sophia','purple','21:20',true,['phone']),
      makeGuest('Dias','green','19:45',true,[]),
      makeGuest('Bekzat','purple','20:55',false,['bag','cup','crumbs']),
      makeGuest('Aruzhan','blue','21:50',true,['phone']),
      makeGuest('Saule','green','21:25',false,['glasses'])
    ]},
    {id:'kitchen',name:'Kitchen',floor:1,guests:[
      makeGuest('Nurlan','red','19:40',true,['phone','cup']),
      makeGuest('Emma','black','20:15',false,['bag']),
      makeGuest('Timur','green','21:05',true,['phone','bag','crumbs']),
      makeGuest('Sergey','yellow','20:50',false,[]),
      makeGuest('Yerlan','red','21:40',true,['glasses','phone']),
      makeGuest('Kamila','green','20:05',false,['cup'])
    ]},
    {id:'living',name:'Living room',floor:1,guests:[
      makeGuest('Daniel','blue','19:55',true,['glasses']),
      makeGuest('Zarina','green','21:10',false,['bag','phone','crumbs']),
      makeGuest('Natasha','yellow','20:30',true,[]),
      makeGuest('Askar','black','21:00',true,['phone']),
      makeGuest('Inkar','purple','20:20',false,['bag'])
    ]}
  ];
  const cloneRooms = () => JSON.parse(JSON.stringify(INITIAL_ROOMS));
  let rooms = cloneRooms();
  const sortedRooms = {balcony:false,hall:false,kitchen:false,living:false};
  let activeModal = null;
  let moving = false;
  let queuedCase = null;

  const CASES = [
    ['Who is in the hall?',"$('#room-hall .guest')"],
    ['Who is dressed in yellow or purple?',"$('.guest.color-yellow, .guest.color-purple')"],
    ['Which AITU students are upstairs?',"$('.floor[data-floor=\"2\"] .guest.aitu')"],
    ['Who has glasses or a bag?',"$('.guest:has(.thing.glasses), .guest:has(.thing.bag)')"],
    ['Who came with nothing at all?',"$('.guest:not(:has(.thing))')"],
    ['Who has a phone but no bag?',"$('.guest:has(.thing.phone):not(:has(.thing.bag))')"],
    ['Who arrived between 20:30 and 21:00 (inclusive)?',"$('.guest').filter((_, el) => $(el).attr('data-time') >= '20:30' && $(el).attr('data-time') <= '21:00')"],
    ['Who arrived after 21:00 and is not an AITU student?',"$('.guest:not(.aitu)').filter((_, el) => $(el).attr('data-time') > '21:00')"],
    ['Who stands right next to Askar?',"$('.guest[data-name=\"Askar\"]').prev('.guest').add('.guest[data-name=\"Askar\"] + .guest')"],
    ['Who stands last in each room?',"$('.room .guest-grid > .guest:last-child')"],
    ['Who stands third in each room?',"$('.room .guest-grid > .guest:nth-child(3)')"],
    ['Who stands after Timur in his room?',"$('.guest[data-name=\"Timur\"]').nextAll('.guest')"],
    ['Who stands right before someone in black?',"$('.guest.color-black').prev('.guest')"],
    ['In which room is Aruzhan?',"$('.room:has(.guest[data-name=\"Aruzhan\"])')"],
    ['Which rooms have fewer than six guests?',"$('.room').filter((_, room) => $(room).find('.guest').length < 6)"],
    ['Which rooms have a cup but no glasses?',"$('.room:has(.thing.cup):not(:has(.thing.glasses))')"],
    ['Who came first to each room?',"$('.room .guest').filter(function(){ return !$(this).siblings('.guest').filter((_, other) => $(other).attr('data-time') < $(this).attr('data-time')).length; })"],
    ['Miras arrives at 21:20, joining between Askar and Inkar.',"$('.guest[data-name=\"Miras\"]') // insertAfter() + fadeIn()"],
    ['Natasha says goodbye and leaves.',"$('.guest[data-name=\"Natasha\"]') // fadeOut() + remove()"],
    ['Who took the cake?',"$('.floor[data-floor=\"1\"] .guest:has(.thing.crumbs):not(:has(.thing.cup))').filter(function(){ const t=$(this).attr('data-time'); return t>'21:00' && t<'21:30' && ($(this).prev('.aitu').length || $(this).next('.aitu').length); })"]
  ];

  function guestMarkup(g) {
    const itemHtml = g.items.length ? g.items.map(item=>`<span class="thing ${item}" title="${item}">${ITEM_ICON[item]}</span>`).join('') : '<span class="no-things">—</span>';
    return `<div class="guest color-${g.color} ${g.aitu?'aitu':''}" role="button" tabindex="0" aria-label="View ${g.name}'s guest card" data-name="${g.name}" data-color="${g.color}" data-time="${g.time}" data-aitu="${g.aitu}" data-items="${g.items.join(',')}" style="--ring-color:${COLOR[g.color]}">
      <div class="avatar-wrap"><img src="assets/avatars/${g.name.toLowerCase()}.svg" alt="Avatar of ${g.name}">${g.aitu?'<span class="aitu-mark" title="AITU student">★</span>':''}</div>
      <strong class="guest-name">${g.name}</strong><div class="guest-time">◷ ${g.time}</div><div class="thing-list">${itemHtml}</div>
    </div>`;
  }
  function roomMarkup(room){
    const list = sortedRooms[room.id] ? room.guests.slice().sort((a,b)=>a.time.localeCompare(b.time)) : room.guests;
    return `<section class="room" id="room-${room.id}" data-room="${room.id}" data-floor="${room.floor}" aria-label="${room.name}">
      <header class="room-header"><h3 class="room-heading">${room.name}</h3><span class="room-count">${room.guests.length} GUESTS</span></header>
      <button class="room-sort ${sortedRooms[room.id]?'is-sorted':''}" type="button" data-room="${room.id}">${sortedRooms[room.id]?'↩ PICTURE ORDER':'↕ SORT BY TIME'}</button>
      <div class="guest-grid">${list.map(guestMarkup).join('')}</div></section>`;
  }
  function buildPage(){
    // Each case starts from DOM constructed from the current array.
    $('#house').empty().append([2,1].map(floor=>`<section class="floor" data-floor="${floor}" aria-label="Floor ${floor}"><div class="floor-sign">FLOOR ${floor}</div>${rooms.filter(room=>room.floor===floor).map(roomMarkup).join('')}</section>`).join(''));
    refreshCounts();
  }
  function refreshCounts(){
    $('.room').each(function(){ const n=$(this).find('.guest').length; $(this).find('.room-count').text(n+' GUEST'+(n===1?'':'S')); });
    const total=rooms.reduce((sum,room)=>sum+room.guests.length,0);
    $('#live-guest-count').text(total+' GUESTS ON SITE');
  }
  function initCaseButtons(){
    const groupLabels={1:'PEOPLE & ATTRIBUTES',9:'ROOMS & NEIGHBORS',18:'LIVE CHANGES & MYSTERY'};
    $('#case-list').empty();
    CASES.forEach((entry,i)=>{
      const n=i+1;
      if(groupLabels[n]) $('<div class="case-group-label">').text(groupLabels[n]).appendTo('#case-list');
      $('<button class="case-button" type="button">').attr('data-case',n).html(`<span class="case-index">${String(n).padStart(2,'0')}</span><span>${entry[0]}</span>`).appendTo('#case-list');
    });
  }

  function queryCase(n){
    // Every branch is one jQuery selector/traversal chain over DOM elements.
    switch(n){
      case 1: return $('#room-hall .guest');
      case 2: return $('.guest.color-yellow, .guest.color-purple');
      case 3: return $('.floor[data-floor="2"] .guest.aitu');
      case 4: return $('.guest:has(.thing.glasses), .guest:has(.thing.bag)');
      case 5: return $('.guest:not(:has(.thing))');
      case 6: return $('.guest:has(.thing.phone):not(:has(.thing.bag))');
      case 7: return $('.guest').filter((_,el)=>$(el).attr('data-time')>='20:30' && $(el).attr('data-time')<='21:00');
      case 8: return $('.guest:not(.aitu)').filter((_,el)=>$(el).attr('data-time')>'21:00');
      case 9: return $('.guest[data-name="Askar"]').prev('.guest').add('.guest[data-name="Askar"] + .guest');
      case 10: return $('.room .guest-grid > .guest:last-child');
      case 11: return $('.room .guest-grid > .guest:nth-child(3)');
      case 12: return $('.guest[data-name="Timur"]').nextAll('.guest');
      case 13: return $('.guest.color-black').prev('.guest');
      case 14: return $('.room:has(.guest[data-name="Aruzhan"])');
      case 15: return $('.room').filter((_,room)=>$(room).find('.guest').length<6);
      case 16: return $('.room:has(.thing.cup):not(:has(.thing.glasses))');
      case 17: return $('.room .guest').filter(function(){return !$(this).siblings('.guest').filter((_,other)=>$(other).attr('data-time')<$(this).attr('data-time')).length;});
      case 18: return $('.guest[data-name="Miras"]');
      case 19: return $('.guest[data-name="Natasha"]');
      case 20: return $('.floor[data-floor="1"] .guest:has(.thing.crumbs):not(:has(.thing.cup))').filter(function(){
        const t=$(this).attr('data-time');
        return t>'21:00' && t<'21:30' && ($(this).prev('.aitu').length || $(this).next('.aitu').length);
      });
      default: return $();
    }
  }
  function selectedNames($selected,isRoom){return $selected.map((_,el)=>isRoom?$(el).find('.room-heading').text():$(el).attr('data-name')).get();}
  function presentResults(n,$found, extra){
    const isRoom=[14,15,16].includes(n);
    const names=selectedNames($found,isRoom);
    const detail=names.length ? names.join(' · ') : (extra || 'No matching guests.');
    const singular=isRoom?'room':'guest';
    $('#result-eyebrow').text(`CASE ${String(n).padStart(2,'0')} / ${isRoom?'ROOM MATCH':'GUEST MATCH'}`);
    $('#result-title').text(n===20 && names.length?'CASE SOLVED: '+names.join(', '):CASES[n-1][0]);
    $('#result-detail').text(`${names.length} ${singular}${names.length===1?'':'s'} matched. ${detail}${extra && names.length?' · '+extra:''}`);
    $('#result-code').text(CASES[n-1][1]);
    $('#result-count').text(String(names.length).padStart(2,'0'));
  }
  function spotlight($found,isRoom,jump){
    const $bright=isRoom?$found.find('.guest'):$found;
    $('.guest').each(function(){
      $(this).removeClass('is-found').stop(true,false).css({top:0,position:'relative'}).fadeTo(300,$bright.toArray().includes(this)?1:.2);
    });
    $bright.addClass('is-found');
    if(jump!==false) $bright.each(function(){ $(this).stop(true,false).fadeTo(130,1).animate({top:-12},145).animate({top:0},185); });
    if(isRoom) $found.css('box-shadow','inset 0 0 0 3px #32cfc5');
  }
  function clearSpotlight(){
    if(moving){queuedCase=-1;return;}
    $('#case-list .case-button').removeClass('is-active');
    $('.room').css('box-shadow','');
    $('.guest').removeClass('is-found').stop(true,false).css({top:0,position:'relative'}).fadeTo(250,1);
    $('#result-eyebrow').text('DETECTIVE CONSOLE');
    $('#result-title').text('Spotlight cleared.');
    $('#result-detail').text('All guests are visible again. Choose another case.');
    $('#result-code').text("$('.guest').stop(true, false).fadeTo(250, 1)");
    $('#result-count').text('—');
  }
  function runCase(n){
    if(moving){queuedCase=n;return;}
    closeGuestCard(true);
    $('.guest').stop(true,true);
    $('.room').css('box-shadow','');
    buildPage();  // Rebuild before EVERY case: original Task 1 rule.
    $('.case-button').removeClass('is-active');
    $(`.case-button[data-case="${n}"]`).addClass('is-active');

    let $arrivingMiras = null;
    if(n===18){
      const living=rooms.find(room=>room.id==='living');
      if(!living.guests.some(g=>g.name==='Miras')){
        const index=living.guests.findIndex(g=>g.name==='Askar');
        const miras=makeGuest('Miras','blue','21:20',true,['phone']);
        living.guests.splice(index+1,0,miras);
        const $new=$(guestMarkup(miras)).hide().insertAfter($('#room-living .guest[data-name="Askar"]'));
        $arrivingMiras=$new;
        refreshCounts();
      }
    }
    if(n===19){
      const $natasha=queryCase(n);
      const living=rooms.find(room=>room.id==='living');
      living.guests=living.guests.filter(g=>g.name!=='Natasha');
      if($natasha.length){
        presentResults(n,$natasha,'Natasha has left the party.');
        spotlight($natasha,false,false);
        $natasha.stop(true,false).fadeOut(540,function(){$(this).remove();refreshCounts();});
      }else{
        presentResults(n,$natasha,'Natasha already left.');
        spotlight($natasha,false,false);
      }
      return;
    }
    const $found=queryCase(n);
    presentResults(n,$found,n===18?'Miras arrived smoothly at 21:20.':n===20?'Clues: downstairs, 21:00–21:30, crumbs, no cup, adjacent to an AITU student.':'');
    spotlight($found,[14,15,16].includes(n),n!==18);
    if($arrivingMiras){
      $arrivingMiras.stop(true,true).hide().fadeIn(460,function(){
        $(this).animate({top:-12},145).animate({top:0},185);
      });
    }
  }

  function getGuestData(name){
    for(const room of rooms){const guest=room.guests.find(g=>g.name===name);if(guest)return {guest,room};}
    return null;
  }
  function closeGuestCard(immediate){
    if(!activeModal){$('#modal-layer').empty();return;}
    const current=activeModal;
    activeModal=null;
    const $card=current.$card.stop(true,false);
    const $shade=$('#modal-layer .info-shade').stop(true,false);
    if(immediate){$('#modal-layer').empty();return;}
    const $avatar=$(`.guest[data-name="${current.name}"] .avatar-wrap`);
    const rect=$avatar.length?$avatar[0].getBoundingClientRect():{left:window.innerWidth/2,top:window.innerHeight/2,width:42,height:42};
    $card.find('.info-body').stop(true,false).fadeTo(100,0);
    $card.animate({left:rect.left,top:rect.top,width:rect.width,height:rect.height,opacity:.2},260,function(){$(this).remove();});
    $shade.fadeOut(260,function(){$(this).remove();});
  }
  function openGuestCard($guest){
    const name=$guest.attr('data-name');
    const data=getGuestData(name);
    if(!data)return;
    closeGuestCard(true);
    const {guest,room}=data;
    const avatar=$guest.find('.avatar-wrap')[0].getBoundingClientRect();
    const width=Math.min(370,window.innerWidth-24), height=Math.min(425,window.innerHeight-24);
    const x=Math.max(12,(window.innerWidth-width)/2);
    const y=Math.max(12,(window.innerHeight-height)/2);
    const items=guest.items.length?guest.items.map(i=>ITEM_NAME[i]).join(', '):'nothing';
    const moves=rooms.filter(r=>r.id!==room.id).map(r=>`<button class="move-button" data-target="${r.id}" type="button">Move to ${r.name}</button>`).join('');
    const markup=`<div class="info-shade"></div><div class="info-card" style="left:${avatar.left}px;top:${avatar.top}px;width:${avatar.width}px;height:${avatar.height}px;opacity:.5;--ring-color:${COLOR[guest.color]}">
      <button class="info-close" type="button" aria-label="Close guest details">×</button>
      <div class="info-body"><div class="info-head"><img src="assets/avatars/${guest.name.toLowerCase()}.svg" alt="Avatar of ${guest.name}"><div><h2 class="info-name">${guest.name}</h2><div class="info-sub">${COLOR[guest.color]?'● ':''}${guest.color} outfit · ${room.name}</div></div></div>
      <div class="info-details"><div class="info-row"><strong>Arrival</strong>Came at ${guest.time}</div><div class="info-row"><strong>Student</strong>${guest.aitu?'AITU student':'Not an AITU student'}</div><div class="info-row"><strong>With them</strong>${guest.items.length?'Has '+items:'Came with nothing'}</div><div class="info-row"><strong>Floor</strong>Floor ${room.floor}</div></div>
      <div class="move-title">CHANGE ROOM · JQUERY ANIMATION</div><div class="move-buttons">${moves}</div><p class="info-note">Click outside or press Esc to close.</p></div></div>`;
    $('#modal-layer').html(markup);
    const $card=$('#modal-layer .info-card');
    activeModal={name,$card};
    $card.animate({left:x,top:y,width,height,opacity:1},320,function(){if(activeModal&&activeModal.$card[0]===$card[0])$card.find('.info-body').fadeTo(180,1);});
  }

  function moveGuest(name,toRoomId){
    if(moving)return;
    const origin=getGuestData(name), dest=rooms.find(r=>r.id===toRoomId);
    if(!origin || !dest || origin.room.id===dest.id)return;
    moving=true;
    const $source=$(`.guest[data-name="${name}"]`);
    const start=$source.offset(), size={width:$source.outerWidth(),height:$source.outerHeight()};
    closeGuestCard(true);
    const $flight=$source.clone().addClass('flight-card').removeClass('is-found').css({left:start.left,top:start.top,width:size.width,height:size.height,margin:0,opacity:1,position:'absolute'}).appendTo('body');
    // State follows the movement: future cases and page rebuilds see the new room.
    origin.room.guests.splice(origin.room.guests.indexOf(origin.guest),1);
    dest.guests.push(origin.guest);
    sortedRooms[toRoomId]=false;
    const $targetGrid=$(`#room-${toRoomId} .guest-grid`);
    const $newGuest=$(guestMarkup(origin.guest)).appendTo($targetGrid).css({visibility:'hidden'});
    const target=$newGuest.offset();
    $newGuest.hide().slideDown(450);
    $source.css('visibility','hidden').slideUp(430,function(){$(this).remove();});
    $flight.stop(true,false).animate({left:target.left,top:target.top,width:size.width,height:size.height},570,'swing',function(){
      $newGuest.stop(true,true).css({visibility:'visible',opacity:1,display:''});
      $(this).remove();
      moving=false;
      refreshCounts();
      $(`#room-${toRoomId} .room-sort`).removeClass('is-sorted').text('↕ SORT BY TIME');
      $('#result-eyebrow').text('TASK 2 / ROOM MOVE');
      $('#result-title').text(`${name} moved to ${dest.name}.`);
      $('#result-detail').text('The array changed too, so subsequent detective cases use the new room.');
      $('#result-code').text(`$('.guest[data-name="${name}"]').clone().animate({left: targetX, top: targetY})`);
      $('#result-count').text('↗');
      if(queuedCase!==null){const q=queuedCase;queuedCase=null;if(q===-1)clearSpotlight();else runCase(q);}
    });
  }
  function sortRoom(roomId){
    if(moving)return;
    const room=rooms.find(r=>r.id===roomId);
    const $grid=$(`#room-${roomId} .guest-grid`);
    const $cards=$grid.children('.guest');
    // .stop(true,false) prevents piled-up animations while preserving current positions.
    $cards.stop(true,false);
    const oldPositions={};
    $cards.each(function(){oldPositions[$(this).attr('data-name')]=$(this).offset();});
    sortedRooms[roomId]=!sortedRooms[roomId];
    const order=sortedRooms[roomId]?room.guests.slice().sort((a,b)=>a.time.localeCompare(b.time)):room.guests;
    const $byName={};
    $cards.each(function(){$byName[$(this).attr('data-name')]=$(this);});
    order.forEach(g=>$grid.append($byName[g.name]));
    // FLIP: measure where each item would be without its current offset.
    $cards.css({left:0,top:0,position:'relative'});
    const newPositions={};
    $cards.each(function(){newPositions[$(this).attr('data-name')]=$(this).offset();});
    $cards.each(function(){
      const name=$(this).attr('data-name'), from=oldPositions[name],to=newPositions[name];
      $(this).css({left:from.left-to.left,top:from.top-to.top}).animate({left:0,top:0},480,'swing');
    });
    $(`#room-${roomId} .room-sort`).toggleClass('is-sorted',sortedRooms[roomId]).text(sortedRooms[roomId]?'↩ PICTURE ORDER':'↕ SORT BY TIME');
    $('#result-eyebrow').text('TASK 2 / ANIMATED SORT');
    $('#result-title').text(`${room.name}: ${sortedRooms[roomId]?'arrival time':'picture order'}.`);
    $('#result-detail').text('Cards slide into place using measured positions and jQuery animate().');
    $('#result-code').text("$cards.stop(true,false).css({left:dx,top:dy}).animate({left:0,top:0},480)");
    $('#result-count').text('↕');
  }
  function resetParty(){
    closeGuestCard(true);
    moving=false;queuedCase=null;
    $('.flight-card').stop(true,true).remove();
    rooms=cloneRooms();
    Object.keys(sortedRooms).forEach(id=>sortedRooms[id]=false);
    buildPage();clearSpotlight();
    $('#result-title').text('Original party restored.');
    $('#result-detail').text('All 21 guests are back in the four rooms from the PDF illustration.');
  }
  $(function(){
    initCaseButtons();buildPage();
    $('#case-list').on('click','.case-button',function(){runCase(Number($(this).attr('data-case')));});
    $('#clear-button').on('click',clearSpotlight);
    $('#reset-button').on('click',resetParty);
    $(document).on('keydown',function(e){if(e.key==='Escape')closeGuestCard(false);});
    $(document).on('click',function(e){if(activeModal && !$(e.target).closest('.info-card, .guest').length)closeGuestCard(false);});
  });
  // Expose a read-only copy for offline defense/tests; case solutions still query the DOM.
  window.cakeMysteryAssignment6 = {rooms:()=>JSON.parse(JSON.stringify(rooms)),queryCase,runCase,sortRoom,resetParty};
})(jQuery);
